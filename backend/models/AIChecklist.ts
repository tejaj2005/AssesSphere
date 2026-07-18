import { Schema, model, Document, Types } from 'mongoose';

export interface IAIChecklist extends Document {
  organization: Types.ObjectId;
  standard: string;
  productType?: string;
  processType?: string;
  result: Record<string, any>;
  generatedBy?: string;
  generatedAt: Date;
}

const schema = new Schema<IAIChecklist>({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  standard: { type: String, required: true },
  productType: String,
  processType: String,
  result: { type: Schema.Types.Mixed, required: true },
  generatedBy: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Unlike AIFinding/AICapa (upserted — the current AI opinion of one evolving entity), a
// checklist run is a point-in-time artifact: re-running it for the same standard tomorrow is a
// separate, equally useful record. Every generation is create()d fresh, so the org needs a
// browsable history sorted newest-first, not a single overwritten row.
schema.index({ organization: 1, generatedAt: -1 });

export const AIChecklist = model<IAIChecklist>('AIChecklist', schema);
