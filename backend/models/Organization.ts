import { Schema, model, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  orgId: string;
  industry: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IOrganization>({
  name:         { type: String, required: true, trim: true },
  orgId:        { type: String, unique: true, sparse: true },
  industry:     { type: String, default: 'Manufacturing' },
  address:      String,
  contactEmail: { type: String, lowercase: true, trim: true },
  contactPhone: String,
  isActive:     { type: Boolean, default: true },
  settings:     { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.orgId) this.orgId = 'ORG-' + Date.now().toString().slice(-6);
});

schema.index({ name: 1 });

export const Organization = model<IOrganization>('Organization', schema);
