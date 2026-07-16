import { AIAuditLog } from '../models/AIAuditLog';

/**
 * The configured Gemini key is on the free tier: a hard 20 requests/day cap
 * (GenerateRequestsPerDayPerProjectPerModel-FreeTier), separate from and much
 * tighter than the usual per-minute rate limit. Once it's hit, every call fails
 * the same way regardless of retries, but a caller doesn't find that out until
 * after a slow request (and sometimes a 503 "high demand" retry on top of that).
 *
 * This tracks today's Gemini call volume from AIAuditLog (already written on every
 * call) and lets adapters fail fast — before spending a network round trip — once
 * we're within GEMINI_QUOTA_BUFFER of the daily cap.
 */
const DAILY_LIMIT = parseInt(process.env.GEMINI_DAILY_QUOTA || '20');
const BUFFER = parseInt(process.env.GEMINI_QUOTA_BUFFER || '2');

export class GeminiQuotaError extends Error {
  constructor(used: number, limit: number) {
    super(`Daily Gemini quota reached (${used}/${limit} free-tier requests used today) — try again after the daily reset.`);
    this.name = 'GeminiQuotaError';
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// A plain "count from the DB, then decide" check has a TOCTOU race: several requests arriving
// close together (e.g. a page that fires off 3-4 AI panels at once) all read the same "17 used"
// count, all pass the `< limit` check, and all proceed — since the audit-log write only happens
// after each call's own Gemini round trip finishes, none of them can see each other's in-flight
// usage. That can burn several requests past the free-tier cap in one burst. Track an in-memory
// counter instead and reserve a slot synchronously (no `await` between the check and the
// increment) — safe because this process is single-threaded, so nothing else can interleave
// between reading and bumping the counter.
let countedDay = '';
let reserved = 0;

async function syncFromDB(): Promise<void> {
  const used = await AIAuditLog.countDocuments({
    provider: 'gemini',
    createdAt: { $gte: startOfToday() },
  });
  reserved = Math.max(reserved, used);
}

/** Throws GeminiQuotaError instead of letting the caller burn a network round trip that will just fail. */
export async function assertGeminiQuotaAvailable(): Promise<void> {
  const today = startOfToday().toISOString();
  if (today !== countedDay) {
    countedDay = today;
    reserved = 0;
    try {
      await syncFromDB();
    } catch {
      // If the audit-log count itself fails (e.g. DB hiccup), don't block real requests over it.
    }
  }
  if (reserved >= DAILY_LIMIT - BUFFER) {
    throw new GeminiQuotaError(reserved, DAILY_LIMIT);
  }
  reserved++;
}
