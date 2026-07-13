import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'Admin' | 'Management' | 'ProductionManager' | 'StoresManager' | 'QualityManager' | 'Inspector';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  organization: Types.ObjectId;
  employeeId?: string;
  isActive: boolean;
  lastLogin?: Date;
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IUser>({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  role:         { type: String, enum: ['Admin','Management','ProductionManager','StoresManager','QualityManager','Inspector'], required: true },
  department:   String,
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  employeeId:   String,
  isActive:     { type: Boolean, default: true },
  lastLogin:    Date,
}, { timestamps: true });

schema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (this.password.length < 8) throw new Error('Password must be at least 8 characters');
  this.password = await bcrypt.hash(this.password, 10);
});

schema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

schema.set('toJSON', {
  transform: (_doc: any, ret: any) => { delete ret.password; return ret; },
});

schema.index({ organization: 1, role: 1 });
schema.index({ organization: 1, isActive: 1 });

export const User = model<IUser>('User', schema);
