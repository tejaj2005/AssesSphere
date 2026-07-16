import { Schema, model, Document, Types } from 'mongoose';

export type InspectionCategory = 'INCOMING_MATERIAL' | 'IN_PROCESS' | 'FINAL_PRODUCT' | 'COMPONENT' | 'CALIBRATION';

export interface IInspectionType extends Document {
  name: string;
  typeId: string;
  category: InspectionCategory;
  description?: string;
  organization: Types.ObjectId;
}

const schema = new Schema<IInspectionType>({
  name:         { type: String, required: true, trim: true },
  typeId:       String,
  category:     { type: String, enum: ['INCOMING_MATERIAL','IN_PROCESS','FINAL_PRODUCT','COMPONENT','CALIBRATION'], required: true },
  description:  String,
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.typeId) this.typeId = `IT-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1, category: 1 });
schema.index({ organization: 1, typeId: 1 }, { unique: true, sparse: true });

export const InspectionType = model<IInspectionType>('InspectionType', schema);
