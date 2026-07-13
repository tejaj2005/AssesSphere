import { Schema, model, Document } from 'mongoose';

export interface IAIGapAnalysis extends Document {
  documentName: string;
  standard: string;
  complianceScore: number;
  analysis: Record<string, any>;
  uploadedBy?: string;
  analyzedAt: Date;
}

const schema = new Schema<IAIGapAnalysis>({
  documentName: { type: String, required: true },
  standard: { type: String, required: true },
  complianceScore: Number,
  analysis: { type: Schema.Types.Mixed, required: true },
  uploadedBy: String,
  analyzedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ analyzedAt: -1 });

export const AIGapAnalysis = model<IAIGapAnalysis>('AIGapAnalysis', schema);
