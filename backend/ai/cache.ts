import { Schema, model, Document } from 'mongoose';

interface ICacheEntry extends Document {
  key: string;
  value: any;
  createdAt: Date;
}

const cacheSchema = new Schema<ICacheEntry>({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

// This is a generous OUTER bound for physical cleanup only — how long a cache row is allowed to
// exist in Mongo before being purged. Whether a given read treats it as still "fresh enough" to
// use is a separate, shorter, per-feature check in getCached() below, so one Mongo TTL index can
// safely serve every feature's cache instead of needing per-document TTL indexes (which Mongoose
// can't easily reconcile with mismatched values once an index already exists).
const OUTER_BOUND_HOURS = Math.max(
  parseInt(process.env.AI_CACHE_TTL_HOURS || '72'),
  parseInt(process.env.AI_CACHE_TTL_CHECKLIST_HOURS || '168'),
);
cacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: OUTER_BOUND_HOURS * 3600 });

const CacheEntry = model<ICacheEntry>('AICacheEntry', cacheSchema);

/**
 * @param maxAgeHours how fresh a hit must be to count as a hit. Defaults to AI_CACHE_TTL_HOURS
 * (72h) — most AI narratives don't need to be regenerated more than once every few days. Pass a
 * longer value (e.g. AI_CACHE_TTL_CHECKLIST_HOURS, 168h/1 week) for reference-style content that's
 * effectively static, like a standard's assessment checklist, to spend even less free-tier quota
 * re-generating something that hasn't changed.
 */
export async function getCached<T>(key: string, maxAgeHours?: number): Promise<T | null> {
  try {
    const entry = await CacheEntry.findOne({ key });
    if (!entry) return null;
    const limitHours = maxAgeHours ?? parseInt(process.env.AI_CACHE_TTL_HOURS || '72');
    const ageMs = Date.now() - entry.createdAt.getTime();
    if (ageMs > limitHours * 3600 * 1000) return null; // still on disk, just too stale to serve
    return entry.value as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  try {
    await CacheEntry.findOneAndUpdate(
      { key },
      { value, createdAt: new Date() },
      { upsert: true, new: true }
    );
  } catch {
    // cache write failure is non-fatal
  }
}

export function buildCacheKey(prefix: string, ...parts: string[]): string {
  const hash = parts.join('|').replace(/\s+/g, '').substring(0, 200);
  return `${prefix}:${hash}`;
}
