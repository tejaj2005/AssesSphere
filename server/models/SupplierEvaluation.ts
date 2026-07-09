import { Schema, model, Document, Types } from 'mongoose';

export interface ISupplierEvaluation extends Document {
  evaluationId: string;
  supplier: Types.ObjectId;
  evaluationDate: Date;
  evaluatedBy: Types.ObjectId;
  period: string;
  qualityScore: number;
  deliveryScore: number;
  quantityScore: number;
  communicationScore: number;
  overallScore: number;
  remarks?: string;
  recommendedStatus: 'MAINTAIN' | 'IMPROVE' | 'SUSPEND' | 'TERMINATE';
  reviewedBy?: Types.ObjectId;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: Date;
  organization: Types.ObjectId;
}

const schema = new Schema<ISupplierEvaluation>({
  evaluationId:     { type: String, unique: true, sparse: true },
  supplier:         { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  evaluationDate:   { type: Date, required: true },
  evaluatedBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  period:           { type: String, required: true },
  qualityScore:     { type: Number, required: true, min: 0, max: 10 },
  deliveryScore:    { type: Number, required: true, min: 0, max: 10 },
  quantityScore:    { type: Number, required: true, min: 0, max: 10 },
  communicationScore:{ type: Number, default: 0, min: 0, max: 10 },
  overallScore:     { type: Number, default: 0 },
  remarks:          String,
  recommendedStatus:{ type: String, enum: ['MAINTAIN','IMPROVE','SUSPEND','TERMINATE'], default: 'MAINTAIN' },
  reviewedBy:       { type: Schema.Types.ObjectId, ref: 'User' },
  reviewStatus:     { type: String, enum: ['PENDING','APPROVED','REJECTED'], default: 'PENDING' },
  approvedAt:       Date,
  organization:     { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.evaluationId) this.evaluationId = `EVAL-${Date.now().toString().slice(-7)}`;
  this.overallScore = parseFloat(
    ((this.qualityScore + this.deliveryScore + this.quantityScore + this.communicationScore) / 4).toFixed(2)
  );
});

schema.index({ organization: 1, supplier: 1, evaluationDate: -1 });
schema.index({ reviewStatus: 1, organization: 1 });

export const SupplierEvaluation = model<ISupplierEvaluation>('SupplierEvaluation', schema);
