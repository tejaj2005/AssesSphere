import { Schema, model, Document, Types } from 'mongoose';

export interface IMaterial extends Document {
  name: string;
  materialId: string;
  materialType?: Types.ObjectId;
  description?: string;
  specifications: Record<string, any>;
  unit: string;
  inspectionRequired: boolean;
  organization: Types.ObjectId;
}

const schema = new Schema<IMaterial>({
  name:               { type: String, required: true, trim: true },
  materialId:         { type: String, unique: true, sparse: true },
  materialType:       { type: Schema.Types.ObjectId, ref: 'MaterialType' },
  description:        String,
  specifications:     { type: Schema.Types.Mixed, default: {} },
  unit:               { type: String, default: 'units' },
  inspectionRequired: { type: Boolean, default: true },
  organization:       { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.materialId) this.materialId = `MAT-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1 });

export const Material = model<IMaterial>('Material', schema);
