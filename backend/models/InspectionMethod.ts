import { Schema, model, Document, Types } from 'mongoose';

export interface IInspectionMethod extends Document {
  name: string;
  methodId: string;
  description?: string;
  equipmentRequired: string[];
  standard?: string;
  organization: Types.ObjectId;
  methodType?: string;
  referenceStandard?: string;
  sampleSize?: string;
  acceptanceCriteria?: string;
  approvalStatus?: string;
  sopFile?: string;
}

const schema = new Schema<IInspectionMethod>({
  name:               { type: String, required: true },
  methodId:           String,
  description:        String,
  equipmentRequired:  [String],
  standard:           String,
  organization:       { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  methodType:         String,
  referenceStandard:  String,
  sampleSize:         String,
  acceptanceCriteria: String,
  approvalStatus:     String,
  sopFile:            String,
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.methodId) this.methodId = `IM-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1, methodId: 1 }, { unique: true, sparse: true });

export const InspectionMethod = model<IInspectionMethod>('InspectionMethod', schema);
