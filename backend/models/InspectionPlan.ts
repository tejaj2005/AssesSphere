import { Schema, model, Document, Types } from 'mongoose';

export type PlanType   = 'R1_MATERIAL' | 'R2_COMPONENT' | 'R3_MANUFACTURING' | 'R4_ASSEMBLY' | 'R5_FINAL';
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';

export interface IChecklistItem {
  parameter: string;
  specificationValue: string;
  toleranceMin?: string;
  toleranceMax?: string;
  unit?: string;
  inspectionMethod?: Types.ObjectId;
  equipment?: Types.ObjectId;
  mandatory: boolean;
  sequence: number;
}

export interface IInspectionPlan extends Document {
  planId: string;
  planType: PlanType;
  title: string;
  product?: Types.ObjectId;
  material?: Types.ObjectId;
  component?: Types.ObjectId;
  manufacturingStage?: Types.ObjectId;
  assemblyStage?: Types.ObjectId;
  supplier?: Types.ObjectId;
  inspectionType: Types.ObjectId;
  checklistTemplate: IChecklistItem[];
  assignedInspectors: Types.ObjectId[];
  status: PlanStatus;
  dueDate?: Date;
  frequency?: string;
  instructions?: string;
  requiredDocuments: string[];
  createdBy: Types.ObjectId;
  organization: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const checklistItemSchema = new Schema<IChecklistItem>({
  parameter:         { type: String, required: true },
  specificationValue:{ type: String, required: true },
  toleranceMin:      String,
  toleranceMax:      String,
  unit:              String,
  inspectionMethod:  { type: Schema.Types.ObjectId, ref: 'InspectionMethod' },
  equipment:         { type: Schema.Types.ObjectId, ref: 'Equipment' },
  mandatory:         { type: Boolean, default: true },
  sequence:          { type: Number, default: 0 },
}, { _id: false });

const schema = new Schema<IInspectionPlan>({
  planId:            String,
  planType:          { type: String, enum: ['R1_MATERIAL','R2_COMPONENT','R3_MANUFACTURING','R4_ASSEMBLY','R5_FINAL'], required: true },
  title:             { type: String, required: true, trim: true },
  product:           { type: Schema.Types.ObjectId, ref: 'Product' },
  material:          { type: Schema.Types.ObjectId, ref: 'Material' },
  component:         { type: Schema.Types.ObjectId, ref: 'Component' },
  manufacturingStage:{ type: Schema.Types.ObjectId, ref: 'ManufacturingStage' },
  assemblyStage:     { type: Schema.Types.ObjectId, ref: 'AssemblyStage' },
  supplier:          { type: Schema.Types.ObjectId, ref: 'Supplier' },
  inspectionType:    { type: Schema.Types.ObjectId, ref: 'InspectionType', required: true },
  checklistTemplate: [checklistItemSchema],
  assignedInspectors:[{ type: Schema.Types.ObjectId, ref: 'User' }],
  status:            { type: String, enum: ['DRAFT','ACTIVE','COMPLETED','CANCELLED','ON_HOLD'], default: 'DRAFT' },
  dueDate:           Date,
  frequency:         String,
  instructions:      String,
  requiredDocuments: [String],
  createdBy:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organization:      { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.planId) {
    const prefix = this.planType.split('_')[0];
    this.planId = `PLAN-${prefix}-${Date.now().toString().slice(-6)}`;
  }
});

schema.index({ organization: 1, planType: 1, status: 1 });
schema.index({ assignedInspectors: 1, status: 1 });
schema.index({ dueDate: 1, status: 1 });
schema.index({ organization: 1, planId: 1 }, { unique: true, sparse: true });

export const InspectionPlan = model<IInspectionPlan>('InspectionPlan', schema);
