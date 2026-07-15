import { Schema, model, Document, Types } from 'mongoose';

export interface IAICapa extends Document {
  findingId: string;
  organization: Types.ObjectId;
  inspectionReportId?: string;
  recommendation: Record<string, any>;
  implementationStatus: string;
  generatedAt: Date;
  acceptedBy?: string;
}

const schema = new Schema<IAICapa>({
  findingId: { type: String, required: true },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  inspectionReportId: String,
  recommendation: { type: Schema.Types.Mixed, required: true },
  implementationStatus: { type: String, default: 'PENDING' },
  generatedAt: { type: Date, default: Date.now },
  acceptedBy: String,
}, { timestamps: true });

schema.index({ organization: 1, findingId: 1 }, { unique: true });

export const AICapa = model<IAICapa>('AICapa', schema);
