import { Schema, model, Document } from 'mongoose';

export interface IAIRiskScore extends Document {
  entityType: string;
  entityId: string;
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
  entityName: String,
  overallScore: { type: Number, required: true },
  riskLevel: { type: String, required: true },
  scoreDetails: { type: Schema.Types.Mixed, required: true },
  calculatedAt: { type: Date, default: Date.now },
  validUntil: { type: Date, default: () => new Date(Date.now() + 7 * 86400000) },
}, { timestamps: true });

schema.index({ entityType: 1, entityId: 1 });

export const AIRiskScore = model<IAIRiskScore>('AIRiskScore', schema);
