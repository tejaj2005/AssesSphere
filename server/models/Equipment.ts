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
  equipmentId:             { type: String, unique: true, sparse: true },
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

schema.index({ organization: 1, calibrationStatus: 1 });
schema.index({ nextCalibrationDate: 1 });

export const Equipment = model<IEquipment>('Equipment', schema);
