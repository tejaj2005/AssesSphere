import { Schema, model, Document, Types } from 'mongoose';

export interface IAIRiskScore extends Document {
  entityType: string;
  entityId: string;
  organization: Types.ObjectId;
  entityName: string;
  overallScore: number;
  riskLevel: string;
  scoreDetails: Record<string, any>;
  calculatedAt: Date;
  validUntil: Date;
}

const schema = new Schema<IAIRiskScore>({
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  entityName: String,
  overallScore: { type: Number, required: true },
  riskLevel: { type: String, required: true },
  scoreDetails: { type: Schema.Types.Mixed, required: true },
  calculatedAt: { type: Date, default: Date.now },
  validUntil: { type: Date, default: () => new Date(Date.now() + 7 * 86400000) },
}, { timestamps: true });

schema.index({ organization: 1, entityType: 1, entityId: 1 }, { unique: true });

export const AIRiskScore = model<IAIRiskScore>('AIRiskScore', schema);
