import { Schema, model, Document, Types } from 'mongoose';

export interface IAIMaturityAssessment extends Document {
  organization: Types.ObjectId;
  result: Record<string, any>;
  generatedBy?: string;
  generatedAt: Date;
}

const schema = new Schema<IAIMaturityAssessment>({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  result: { type: Schema.Types.Mixed, required: true },
  generatedBy: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ organization: 1, generatedAt: -1 });

export const AIMaturityAssessment = model<IAIMaturityAssessment>('AIMaturityAssessment', schema);
