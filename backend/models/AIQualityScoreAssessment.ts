import { Schema, model, Document, Types } from 'mongoose';

export interface IAIQualityScoreAssessment extends Document {
  organization: Types.ObjectId;
  assessmentId: string;
  result: Record<string, any>;
  generatedBy?: string;
  generatedAt: Date;
}

const schema = new Schema<IAIQualityScoreAssessment>({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  assessmentId: { type: String, required: true },
  result: { type: Schema.Types.Mixed, required: true },
  generatedBy: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ organization: 1, generatedAt: -1 });

export const AIQualityScoreAssessment = model<IAIQualityScoreAssessment>('AIQualityScoreAssessment', schema);
