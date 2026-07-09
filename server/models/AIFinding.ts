import { Schema, model, Document } from 'mongoose';

export interface IAIFinding extends Document {
  inspectionReportId: string;
  productId?: string;
  stage?: string;
  findings: Record<string, any>;
  confidenceScore: number;
  reviewStatus: 'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
  reviewedBy?: string;
  generatedAt: Date;
}

const schema = new Schema<IAIFinding>({
  inspectionReportId: { type: String, required: true, index: true },
  productId: String,
  stage: { type: String, enum: ['R1', 'R2', 'R3', 'R4', 'R5'] },
  findings: { type: Schema.Types.Mixed, required: true },
  confidenceScore: { type: Number, default: 0 },
  reviewStatus: { type: String, enum: ['PENDING', 'ACCEPTED', 'MODIFIED', 'REJECTED'], default: 'PENDING' },
  reviewedBy: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const AIFinding = model<IAIFinding>('AIFinding', schema);
