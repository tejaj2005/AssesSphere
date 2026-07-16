import { Schema, model, Document, Types } from 'mongoose';

export interface IMaterialType extends Document {
  name: string;
  typeId: string;
  description?: string;
  organization: Types.ObjectId;
}

const schema = new Schema<IMaterialType>({
  name:         { type: String, required: true },
  typeId:       String,
  description:  String,
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.typeId) this.typeId = `MT-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1, typeId: 1 }, { unique: true, sparse: true });

export const MaterialType = model<IMaterialType>('MaterialType', schema);
