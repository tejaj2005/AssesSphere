import { Schema, model, Document, Types } from 'mongoose';

export type CalibrationStatus = 'COMPLETED' | 'PENDING' | 'OVERDUE' | 'NOT_REQUIRED';

export interface IEquipment extends Document {
  name: string;
  equipmentId: string;
  type: string;
  modelNumber?: string;
  serialNumber?: string;
  vendorName?: string;
  calibrationStatus: CalibrationStatus;
  lastCalibrationDate?: Date;
  nextCalibrationDate?: Date;
  calibrationFrequencyDays: number;
  location?: string;
  isActive: boolean;
  organization: Types.ObjectId;
}

const schema = new Schema<IEquipment>({
  name:                    { type: String, required: true, trim: true },
  equipmentId:             String,
  type:                    { type: String, required: true },
  modelNumber:             String,
  serialNumber:            String,
  vendorName:              String,
  calibrationStatus:       { type: String, enum: ['COMPLETED','PENDING','OVERDUE','NOT_REQUIRED'], default: 'PENDING' },
  lastCalibrationDate:     Date,
  nextCalibrationDate:     Date,
  calibrationFrequencyDays:{ type: Number, default: 365 },
  location:                String,
  isActive:                { type: Boolean, default: true },
  organization:            { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.equipmentId) this.equipmentId = `EQP-${Date.now().toString().slice(-6)}`;
  if (this.nextCalibrationDate && new Date() > this.nextCalibrationDate) {
    this.calibrationStatus = 'OVERDUE';
  }
});

// The pre-save hook above only runs on .save()/.create() — every actual mutation after
// creation (the generic admin PUT, and the calibration-approval flow that sets a fresh
// nextCalibrationDate) goes through findByIdAndUpdate, which Mongoose document middleware
// never sees. Without this, equipment recalibrated with a due date already in the past (or
// simply edited without anyone recomputing status by hand) got stamped COMPLETED/PENDING and
// stayed that way forever, silently reporting genuinely overdue equipment as compliant.
schema.pre('findOneAndUpdate', function () {
  const update: any = this.getUpdate();
  if (!update) return;
  const target = update.$set || update;
  const nextDate = target.nextCalibrationDate;
  if (nextDate === undefined) return;
  if (new Date() > new Date(nextDate)) target.calibrationStatus = 'OVERDUE';
});

schema.index({ organization: 1, calibrationStatus: 1 });
schema.index({ nextCalibrationDate: 1 });
schema.index({ organization: 1, equipmentId: 1 }, { unique: true, sparse: true });

export const Equipment = model<IEquipment>('Equipment', schema);
