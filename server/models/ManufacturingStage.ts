import { Schema, model, Document, Types } from 'mongoose';

export interface IManufacturingStage extends Document {
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

const schema = new Schema<IManufacturingStage>({
  name:              { type: String, required: true, trim: true },
  stageId:           String,
  sequence:          { type: Number, default: 0 },
  description:       String,
  organization:      { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  standardTimeMin:   Number,
  setupTimeMin:      Number,
  criticalToQuality: { type: Boolean, default: false },
  workCenter:        String,
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.stageId) this.stageId = `MFG-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1, sequence: 1 });
schema.index({ organization: 1, stageId: 1 }, { unique: true, sparse: true });

export const ManufacturingStage = model<IManufacturingStage>('ManufacturingStage', schema);
