import { Schema, model, Document, Types } from 'mongoose';

export interface IComponent extends Document {
  name: string;
  componentId: string;
  description?: string;
  specifications: Record<string, any>;
  material?: Types.ObjectId;
  primarySupplier?: Types.ObjectId;
  inspectionRequired: boolean;
  organization: Types.ObjectId;
}

const schema = new Schema<IComponent>({
  name:               { type: String, required: true, trim: true },
  componentId:        String,
  description:        String,
  specifications:     { type: Schema.Types.Mixed, default: {} },
  material:           { type: Schema.Types.ObjectId, ref: 'Material' },
  primarySupplier:    { type: Schema.Types.ObjectId, ref: 'Supplier' },
  inspectionRequired: { type: Boolean, default: true },
  organization:       { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.componentId) this.componentId = `CMP-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1 });
schema.index({ organization: 1, componentId: 1 }, { unique: true, sparse: true });

export const Component = model<IComponent>('Component', schema);
