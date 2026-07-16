import { Schema, model, Document } from 'mongoose';

export interface IAIAuditLog extends Document {
  feature: string;
  userId?: string;
  inputSummary?: string;
  tokensUsed?: number;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
  provider: string;
  createdAt: Date;
}

const schema = new Schema<IAIAuditLog>({
  feature: { type: String, required: true, index: true },
  userId: String,
  inputSummary: String,
  tokensUsed: Number,
  durationMs: Number,
  success: { type: Boolean, default: true },
  errorMessage: String,
  provider: { type: String, default: 'gemini' },
  createdAt: { type: Date, default: Date.now, index: true },
});

// quotaGuard.ts runs `{ provider, createdAt: { $gte } }` on every single Gemini call — a
// compound index keeps that hot-path count cheap instead of scanning by createdAt alone.
schema.index({ provider: 1, createdAt: -1 });

export const AIAuditLog = model<IAIAuditLog>('AIAuditLog', schema);
