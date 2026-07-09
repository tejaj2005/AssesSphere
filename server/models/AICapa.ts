import { Schema, model, Document } from 'mongoose';

export interface IAICapa extends Document {
  findingId: string;
  inspectionReportId?: string;
  recommendation: Record<string, any>;
  implementationStatus: string;
  generatedAt: Date;
  acceptedBy?: string;
}

const schema = new Schema<IAICapa>({
  findingId: { type: String, required: true, index: true },
  inspectionReportId: String,
  recommendation: { type: Schema.Types.Mixed, required: true },
  implementationStatus: { type: String, default: 'PENDING' },
  generatedAt: { type: Date, default: Date.now },
  acceptedBy: String,
}, { timestamps: true });

export const AICapa = model<IAICapa>('AICapa', schema);
