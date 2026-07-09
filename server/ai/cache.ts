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

const TTL_SECONDS = (parseInt(process.env.AI_CACHE_TTL_HOURS || '24')) * 3600;
cacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

const CacheEntry = model<ICacheEntry>('AICacheEntry', cacheSchema);

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const entry = await CacheEntry.findOne({ key });
    return entry ? (entry.value as T) : null;
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
