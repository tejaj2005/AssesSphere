import { Schema, model, Document, Types } from 'mongoose';

export interface ICalibrationRecord extends Document {
  equipment: Types.ObjectId;
  calibrationDate: Date;
  nextDueDate: Date;
  performedBy: string;
  certificate?: string;
  certificateFileUrl?: string;
  result: 'PASS' | 'FAIL' | 'CONDITIONAL';
  notes?: string;
  organization: Types.ObjectId;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedBy?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
}

const schema = new Schema<ICalibrationRecord>({
  equipment:       { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
  calibrationDate: { type: Date, required: true },
  nextDueDate:     { type: Date, required: true },
  performedBy:     { type: String, required: true },
  certificate:     String,
  certificateFileUrl: String,
  result:          { type: String, enum: ['PASS','FAIL','CONDITIONAL'], required: true },
  notes:           String,
  organization:    { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  approvalStatus:  { type: String, enum: ['PENDING','APPROVED','REJECTED'], default: 'PENDING' },
  submittedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedBy:      { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:      Date,
  rejectionReason: String,
}, { timestamps: true });

schema.index({ equipment: 1, calibrationDate: -1 });
schema.index({ organization: 1, approvalStatus: 1 });

export const CalibrationRecord = model<ICalibrationRecord>('CalibrationRecord', schema);
