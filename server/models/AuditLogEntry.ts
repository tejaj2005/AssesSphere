import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLogEntry extends Document {
  action: 'Created' | 'Updated' | 'Deleted';
  entityType: string;
  entityName: string;
  entityId?: string;
  performedBy: Types.ObjectId;
  organization: Types.ObjectId;
  createdAt: Date;
}

const schema = new Schema<IAuditLogEntry>({
  action:       { type: String, enum: ['Created','Updated','Deleted'], required: true },
  entityType:   { type: String, required: true },
  entityName:   { type: String, required: true },
  entityId:     String,
  performedBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdAt:    { type: Date, default: Date.now },
});

schema.index({ organization: 1, createdAt: -1 });
schema.index({ entityType: 1 });

export const AuditLogEntry = model<IAuditLogEntry>('AuditLogEntry', schema);
