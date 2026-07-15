import { Schema, model, Document, Types } from 'mongoose';

export interface IAIGapAnalysis extends Document {
  documentName: string;
  organization: Types.ObjectId;
  standard: string;
  complianceScore: number;
  analysis: Record<string, any>;
  uploadedBy?: string;
  analyzedAt: Date;
}

const schema = new Schema<IAIGapAnalysis>({
  documentName: { type: String, required: true },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  standard: { type: String, required: true },
  complianceScore: Number,
  analysis: { type: Schema.Types.Mixed, required: true },
  uploadedBy: String,
  analyzedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ organization: 1, analyzedAt: -1 });

export const AIGapAnalysis = model<IAIGapAnalysis>('AIGapAnalysis', schema);
