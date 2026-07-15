import { Schema, model, Document, Types } from 'mongoose';

export interface IProductQualityPlan extends Document {
  pqpId: string;
  product: Types.ObjectId;
  manufacturingInspections: {
    stage?: Types.ObjectId;
    plan?: Types.ObjectId;
    report?: Types.ObjectId;
    inspector?: Types.ObjectId;
    status: string;
    notes?: string;
  }[];
  assemblyInspections: {
    stage?: Types.ObjectId;
    plan?: Types.ObjectId;
    report?: Types.ObjectId;
    inspector?: Types.ObjectId;
    status: string;
    notes?: string;
  }[];
  finalProductInspection: {
    plan?: Types.ObjectId;
    report?: Types.ObjectId;
    inspector?: Types.ObjectId;
    status: string;
  };
  materialInspections: {
    material?: Types.ObjectId;
    plan?: Types.ObjectId;
    report?: Types.ObjectId;
    status: string;
  }[];
  qualityManager: Types.ObjectId;
  reviewer?: Types.ObjectId;
  reviewDate?: Date;
  reviewStatus: 'PENDING' | 'COMPLETED';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  overallStatus: 'GREEN' | 'AMBER' | 'RED' | 'GREY';
  createdBy: Types.ObjectId;
  organization: Types.ObjectId;
  completedAt?: Date;
}

const stageRefSchema = new Schema({
  stage:    Schema.Types.ObjectId,
  plan:     { type: Schema.Types.ObjectId, ref: 'InspectionPlan' },
  report:   { type: Schema.Types.ObjectId, ref: 'InspectionReport' },
  inspector:{ type: Schema.Types.ObjectId, ref: 'User' },
  status:   { type: String, default: 'PENDING' },
  notes:    String,
}, { _id: false });

const schema = new Schema<IProductQualityPlan>({
  pqpId:                    String,
  product:                  { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  manufacturingInspections: [stageRefSchema],
  assemblyInspections:      [stageRefSchema],
  finalProductInspection: {
    plan:     { type: Schema.Types.ObjectId, ref: 'InspectionPlan' },
    report:   { type: Schema.Types.ObjectId, ref: 'InspectionReport' },
    inspector:{ type: Schema.Types.ObjectId, ref: 'User' },
    status:   { type: String, default: 'PENDING' },
  },
  materialInspections: [{
    material: { type: Schema.Types.ObjectId, ref: 'Material' },
    plan:     { type: Schema.Types.ObjectId, ref: 'InspectionPlan' },
    report:   { type: Schema.Types.ObjectId, ref: 'InspectionReport' },
    status:   { type: String, default: 'PENDING' },
  }],
  qualityManager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewer:       { type: Schema.Types.ObjectId, ref: 'User' },
  reviewDate:     Date,
  reviewStatus:   { type: String, enum: ['PENDING','COMPLETED'], default: 'PENDING' },
  status:         { type: String, enum: ['DRAFT','ACTIVE','COMPLETED','ON_HOLD'], default: 'DRAFT' },
  overallStatus:  { type: String, enum: ['GREEN','AMBER','RED','GREY'], default: 'GREY' },
  createdBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organization:   { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  completedAt:    Date,
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.pqpId) this.pqpId = `PQP-${Date.now().toString().slice(-7)}`;
});

schema.index({ organization: 1, status: 1 });
schema.index({ product: 1 });
schema.index({ qualityManager: 1 });
schema.index({ organization: 1, pqpId: 1 }, { unique: true, sparse: true });

export const ProductQualityPlan = model<IProductQualityPlan>('ProductQualityPlan', schema);
