import { Schema, model, Document, Types } from 'mongoose';

export type ReportStatus  = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ON_HOLD';
export type OverallResult = 'PASS' | 'FAIL' | 'CONDITIONAL' | 'PENDING';

export interface IChecklistResult {
  parameter: string;
  specificationValue: string;
  actualValue: string;
  toleranceMin?: string;
  toleranceMax?: string;
  result: 'PASS' | 'FAIL' | 'MARGINAL' | 'NA';
  observations?: string;
  equipment?: Types.ObjectId;
  variancePercent?: number;
}

export interface IEvidenceFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
  uploadedBy?: Types.ObjectId;
  aiValidation?: Record<string, any>;
}

export interface IInspectionReport extends Document {
  reportId: string;
  plan: Types.ObjectId;
  inspectionDate: Date;
  inspector: Types.ObjectId;
  status: ReportStatus;
  checklistResults: IChecklistResult[];
  evidenceFiles: IEvidenceFile[];
  overallResult: OverallResult;
  passCount: number;
  failCount: number;
  marginalCount: number;
  observations?: string;
  nonConformities?: string;
  aiFindings?: Types.ObjectId;
  aiCapas?: Types.ObjectId[];
  aiQualityScore?: number;
  submittedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  reviewComments?: string;
  l1ReviewedBy?: Types.ObjectId;
  l1ReviewedAt?: Date;
  l1Comments?: string;
  organization: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const resultSchema = new Schema<IChecklistResult>({
  parameter:          { type: String, required: true },
  specificationValue: { type: String, required: true },
  actualValue:        { type: String, required: true },
  toleranceMin:       String,
  toleranceMax:       String,
  result:             { type: String, enum: ['PASS','FAIL','MARGINAL','NA'], required: true },
  observations:       String,
  equipment:          { type: Schema.Types.ObjectId, ref: 'Equipment' },
  variancePercent:    Number,
}, { _id: false });

const evidenceSchema = new Schema<IEvidenceFile>({
  fileName:     String,
  fileUrl:      String,
  fileType:     String,
  uploadedAt:   { type: Date, default: Date.now },
  uploadedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  aiValidation: Schema.Types.Mixed,
}, { _id: true });

const schema = new Schema<IInspectionReport>({
  reportId:        { type: String, unique: true, sparse: true },
  plan:            { type: Schema.Types.ObjectId, ref: 'InspectionPlan', required: true },
  inspectionDate:  { type: Date, required: true },
  inspector:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:          { type: String, enum: ['DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','ON_HOLD'], default: 'DRAFT' },
  checklistResults:[resultSchema],
  evidenceFiles:   [evidenceSchema],
  overallResult:   { type: String, enum: ['PASS','FAIL','CONDITIONAL','PENDING'], default: 'PENDING' },
  passCount:       { type: Number, default: 0 },
  failCount:       { type: Number, default: 0 },
  marginalCount:   { type: Number, default: 0 },
  observations:    String,
  nonConformities: String,
  aiFindings:      { type: Schema.Types.ObjectId, ref: 'AIFinding' },
  aiCapas:         [{ type: Schema.Types.ObjectId, ref: 'AICapa' }],
  aiQualityScore:  Number,
  submittedAt:     Date,
  reviewedBy:      { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:      Date,
  approvedBy:      { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt:      Date,
  rejectionReason: String,
  reviewComments:  String,
  l1ReviewedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  l1ReviewedAt:    Date,
  l1Comments:      String,
  organization:    { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.reportId) this.reportId = `RPT-${Date.now().toString().slice(-8)}`;
  if (this.checklistResults?.length) {
    this.passCount     = this.checklistResults.filter(r => r.result === 'PASS').length;
    this.failCount     = this.checklistResults.filter(r => r.result === 'FAIL').length;
    this.marginalCount = this.checklistResults.filter(r => r.result === 'MARGINAL').length;
    if (this.failCount > 0)          this.overallResult = 'FAIL';
    else if (this.marginalCount > 0) this.overallResult = 'CONDITIONAL';
    else if (this.passCount > 0)     this.overallResult = 'PASS';
  }
});

schema.index({ organization: 1, status: 1 });
schema.index({ inspector: 1, status: 1 });
schema.index({ plan: 1 });
schema.index({ inspectionDate: -1 });
schema.index({ overallResult: 1, organization: 1 });

export const InspectionReport = model<IInspectionReport>('InspectionReport', schema);
