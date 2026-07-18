import { Schema, model, Document, Types } from 'mongoose';

export interface IAIExecutiveSummary extends Document {
  organization: Types.ObjectId;
  period: string;
  result: Record<string, any>;
  generatedBy?: string;
  generatedAt: Date;
}

const schema = new Schema<IAIExecutiveSummary>({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  period: { type: String, required: true },
  result: { type: Schema.Types.Mixed, required: true },
  generatedBy: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ organization: 1, generatedAt: -1 });

export const AIExecutiveSummary = model<IAIExecutiveSummary>('AIExecutiveSummary', schema);
