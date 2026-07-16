import { Schema, model, Document, Types } from 'mongoose';

export type ProductionPlanStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
export type ProductionStageType = 'MANUFACTURING' | 'ASSEMBLING';
export type ProductionStageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface IProductionStageAssignment {
  stage: Types.ObjectId;
  stageType: ProductionStageType;
  order: number;
  workCenter?: string;
  standardTimeMin?: number;
  operator?: Types.ObjectId;
  status: ProductionStageStatus;
}

export interface IProductionPlan extends Document {
  planId: string;
  product: Types.ObjectId;
  targetQuantity: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
  manufacturingStages: IProductionStageAssignment[];
  assemblingStages: IProductionStageAssignment[];
  status: ProductionPlanStatus;
  notes?: string;
  createdBy: Types.ObjectId;
  organization: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stageAssignmentSchema = new Schema<IProductionStageAssignment>({
  stage:           { type: Schema.Types.ObjectId, required: true },
  stageType:       { type: String, enum: ['MANUFACTURING','ASSEMBLING'], required: true },
  order:           { type: Number, default: 0 },
  workCenter:      String,
  standardTimeMin: Number,
  operator:        { type: Schema.Types.ObjectId, ref: 'User' },
  status:          { type: String, enum: ['NOT_STARTED','IN_PROGRESS','COMPLETED'], default: 'NOT_STARTED' },
}, { _id: false });

const schema = new Schema<IProductionPlan>({
  planId:              String,
  product:             { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  targetQuantity:      { type: Number, required: true },
  plannedStartDate:    { type: Date, required: true },
  plannedEndDate:      { type: Date, required: true },
  manufacturingStages: [stageAssignmentSchema],
  assemblingStages:    [stageAssignmentSchema],
  status:              { type: String, enum: ['DRAFT','SCHEDULED','IN_PROGRESS','COMPLETED'], default: 'DRAFT' },
  notes:               String,
  createdBy:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organization:        { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.planId) this.planId = `PP-${Date.now().toString().slice(-7)}`;
});

schema.index({ organization: 1, status: 1 });
schema.index({ product: 1 });
schema.index({ organization: 1, planId: 1 }, { unique: true, sparse: true });

export const ProductionPlan = model<IProductionPlan>('ProductionPlan', schema);
