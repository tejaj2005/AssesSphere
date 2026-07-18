import { Schema, model, Document, Types } from 'mongoose';

export interface IAIPrediction extends Document {
  organization: Types.ObjectId;
  entityType: string;
  entityId: string;
  entityName: string;
  result: Record<string, any>;
  generatedBy?: string;
  generatedAt: Date;
}

const schema = new Schema<IAIPrediction>({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  entityName: String,
  result: { type: Schema.Types.Mixed, required: true },
  generatedBy: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ organization: 1, entityType: 1, entityId: 1, generatedAt: -1 });

export const AIPrediction = model<IAIPrediction>('AIPrediction', schema);
