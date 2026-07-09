import { Schema, model, Document, Types } from 'mongoose';

export interface IPermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface IRole extends Document {
  name: string;
  roleId: string;
  description?: string;
  isSystem: boolean;
  permissions: Record<string, IPermission>;
  organization: Types.ObjectId;
}

const permissionSchema = new Schema<IPermission>({
  view:   { type: Boolean, default: false },
  create: { type: Boolean, default: false },
  edit:   { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
}, { _id: false });

const schema = new Schema<IRole>({
  name:         { type: String, required: true, trim: true },
  roleId:       { type: String, unique: true, sparse: true },
  description:  String,
  isSystem:     { type: Boolean, default: false },
  permissions:  { type: Map, of: permissionSchema, default: {} },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.roleId) this.roleId = `ROLE-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1 });

export const Role = model<IRole>('Role', schema);
