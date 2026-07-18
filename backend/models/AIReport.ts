import { Schema, model, Document, Types } from 'mongoose';

export interface IAIReport extends Document {
  organization: Types.ObjectId;
  reportType: string;
  period: { from: string; to: string };
  result: Record<string, any>;
  generatedBy?: string;
  generatedAt: Date;
}

const schema = new Schema<IAIReport>({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  reportType: { type: String, required: true },
  period: {
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  result: { type: Schema.Types.Mixed, required: true },
  generatedBy: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Point-in-time artifact (a quarterly report and next quarter's are both worth keeping) —
// create()d fresh on every generation, never upserted.
schema.index({ organization: 1, generatedAt: -1 });

export const AIReport = model<IAIReport>('AIReport', schema);
