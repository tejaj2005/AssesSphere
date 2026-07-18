import { Schema, model, Document, Types } from 'mongoose';

export interface IAIBenchmark extends Document {
  organization: Types.ObjectId;
  entityType: string;
  result: Record<string, any>;
  generatedBy?: string;
  generatedAt: Date;
}

const schema = new Schema<IAIBenchmark>({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  entityType: { type: String, required: true },
  result: { type: Schema.Types.Mixed, required: true },
  generatedBy: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ organization: 1, generatedAt: -1 });

export const AIBenchmark = model<IAIBenchmark>('AIBenchmark', schema);
