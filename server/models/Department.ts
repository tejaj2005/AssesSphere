import { Schema, model, Document, Types } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  departmentId: string;
  organization: Types.ObjectId;
  head?: Types.ObjectId;
  description?: string;
  isActive: boolean;
}

const schema = new Schema<IDepartment>({
  name:           { type: String, required: true, trim: true },
  departmentId:   { type: String, unique: true, sparse: true },
  organization:   { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  head:           { type: Schema.Types.ObjectId, ref: 'User' },
  description:    String,
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.departmentId) this.departmentId = 'DEPT-' + Date.now().toString().slice(-6);
});

schema.index({ organization: 1 });

export const Department = model<IDepartment>('Department', schema);
