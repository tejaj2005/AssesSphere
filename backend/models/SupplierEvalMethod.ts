import { Schema, model, Document, Types } from 'mongoose';

export interface ISupplierEvalMethod extends Document {
  name: string;
  methodId: string;
  description?: string;
  isSystem: boolean;
  organization: Types.ObjectId;
}

const schema = new Schema<ISupplierEvalMethod>({
  name:         { type: String, required: true, trim: true },
  methodId:     String,
  description:  String,
  isSystem:     { type: Boolean, default: false },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.methodId) this.methodId = `SEM-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1, methodId: 1 }, { unique: true, sparse: true });

export const SupplierEvalMethod = model<ISupplierEvalMethod>('SupplierEvalMethod', schema);
