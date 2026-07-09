import { Schema, model, Document, Types } from 'mongoose';

export interface IMaterialType extends Document {
  name: string;
  typeId: string;
  description?: string;
  organization: Types.ObjectId;
}

const schema = new Schema<IMaterialType>({
  name:         { type: String, required: true },
  typeId:       { type: String, unique: true, sparse: true },
  description:  String,
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.typeId) this.typeId = `MT-${Date.now().toString().slice(-6)}`;
});

export const MaterialType = model<IMaterialType>('MaterialType', schema);
