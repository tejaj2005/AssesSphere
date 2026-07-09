import { Schema, model, Document, Types } from 'mongoose';

export interface IAssemblyStage extends Document {
  name: string;
  stageId: string;
  sequence: number;
  description?: string;
  organization: Types.ObjectId;
  standardTimeMin?: number;
  setupTimeMin?: number;
  criticalToQuality?: boolean;
  workCenter?: string;
}

const schema = new Schema<IAssemblyStage>({
  name:              { type: String, required: true, trim: true },
  stageId:           { type: String, unique: true, sparse: true },
  sequence:          { type: Number, default: 0 },
  description:       String,
  organization:      { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  standardTimeMin:   Number,
  setupTimeMin:      Number,
  criticalToQuality: { type: Boolean, default: false },
  workCenter:        String,
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.stageId) this.stageId = `ASM-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1, sequence: 1 });

export const AssemblyStage = model<IAssemblyStage>('AssemblyStage', schema);
