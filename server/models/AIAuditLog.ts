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

export const AIAuditLog = model<IAIAuditLog>('AIAuditLog', schema);
