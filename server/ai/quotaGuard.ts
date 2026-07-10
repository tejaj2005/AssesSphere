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

/** Throws GeminiQuotaError instead of letting the caller burn a network round trip that will just fail. */
export async function assertGeminiQuotaAvailable(): Promise<void> {
  try {
    const used = await AIAuditLog.countDocuments({
      provider: 'gemini',
      createdAt: { $gte: startOfToday() },
    });
    if (used >= DAILY_LIMIT - BUFFER) {
      throw new GeminiQuotaError(used, DAILY_LIMIT);
    }
  } catch (err) {
    if (err instanceof GeminiQuotaError) throw err;
    // If the audit-log count itself fails (e.g. DB hiccup), don't block real requests over it.
  }
}
