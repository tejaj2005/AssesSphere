import { Schema, model, Document, Types } from 'mongoose';

export type SupplierStatus = 'APPROVED' | 'PENDING' | 'CONDITIONAL' | 'SUSPENDED' | 'BLACKLISTED';

export interface ISupplier extends Document {
  name: string;
  supplierId: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  category: string;
  approvalStatus: SupplierStatus;
  overallRating: number;
  qualityRating: number;
  deliveryRating: number;
  evaluationCount: number;
  lastEvaluationDate?: Date;
  organization: Types.ObjectId;
  notes?: string;
  materials: Types.ObjectId[];
  leadTimeDays?: number;
  paymentTerms?: string;
  certification?: string;
  attachments: string[];
}

const schema = new Schema<ISupplier>({
  name:               { type: String, required: true, trim: true },
  supplierId:         { type: String, unique: true, sparse: true },
  contactPerson:      String,
  email:              { type: String, lowercase: true, trim: true },
  phone:              String,
  address:            String,
  category:           { type: String, default: 'General' },
  approvalStatus:     { type: String, enum: ['APPROVED','PENDING','CONDITIONAL','SUSPENDED','BLACKLISTED'], default: 'PENDING' },
  overallRating:      { type: Number, default: 0, min: 0, max: 10 },
  qualityRating:      { type: Number, default: 0, min: 0, max: 10 },
  deliveryRating:     { type: Number, default: 0, min: 0, max: 10 },
  evaluationCount:    { type: Number, default: 0 },
  lastEvaluationDate: Date,
  organization:       { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  notes:              String,
  materials:          [{ type: Schema.Types.ObjectId, ref: 'Material' }],
  leadTimeDays:       Number,
  paymentTerms:       String,
  certification:      String,
  attachments:        [String],
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.supplierId) this.supplierId = `SUP-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1, approvalStatus: 1 });
schema.index({ overallRating: -1 });

export const Supplier = model<ISupplier>('Supplier', schema);
