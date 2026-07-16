import { Schema, model, Document, Types } from 'mongoose';

export interface IAIFinding extends Document {
  inspectionReportId: string;
  organization: Types.ObjectId;
  productId?: string;
  stage?: string;
  findings: Record<string, any>;
  confidenceScore: number;
  reviewStatus: 'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
  reviewedBy?: string;
  generatedAt: Date;
}

const schema = new Schema<IAIFinding>({
  inspectionReportId: { type: String, required: true },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  productId: String,
  stage: { type: String, enum: ['R1', 'R2', 'R3', 'R4', 'R5'] },
  findings: { type: Schema.Types.Mixed, required: true },
  confidenceScore: { type: Number, default: 0 },
  reviewStatus: { type: String, enum: ['PENDING', 'ACCEPTED', 'MODIFIED', 'REJECTED'], default: 'PENDING' },
  reviewedBy: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Scoped per-org, not globally — inspectionReportId alone isn't safe to key an upsert on
// across tenants (two different organizations' reports could collide on any client-suppliable
// id), and this is also what backs the cache/regeneration lookup for this feature.
schema.index({ organization: 1, inspectionReportId: 1 }, { unique: true });

export const AIFinding = model<IAIFinding>('AIFinding', schema);
