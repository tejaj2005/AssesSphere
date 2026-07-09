import { Schema, model, Document, Types } from 'mongoose';

export type DocumentCategory = 'Procedure' | 'Policy' | 'Guideline' | 'Checklist' | 'Template' | 'Design' | 'Report' | 'Certificate';
export type DocumentFileType = 'PDF' | 'DOCX' | 'XLSX' | 'DWG' | 'IMAGE';

export interface IMfgDocument extends Document {
  name: string;
  documentId: string;
  description?: string;
  category?: DocumentCategory;
  fileType?: DocumentFileType;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  version?: string;
  manufacturingStage?: Types.ObjectId;
  uploadedBy?: Types.ObjectId;
  organization: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IMfgDocument>({
  name:               { type: String, required: true, trim: true },
  documentId:         { type: String, unique: true, sparse: true },
  description:        String,
  category:           { type: String, enum: ['Procedure','Policy','Guideline','Checklist','Template','Design','Report','Certificate'] },
  fileType:           { type: String, enum: ['PDF','DOCX','XLSX','DWG','IMAGE'] },
  fileName:           String,
  fileSize:           String,
  fileUrl:            String,
  version:            String,
  manufacturingStage: { type: Schema.Types.ObjectId, ref: 'ManufacturingStage' },
  uploadedBy:         { type: Schema.Types.ObjectId, ref: 'User' },
  organization:       { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.documentId) this.documentId = `DOC-${Date.now().toString().slice(-6)}`;
});

schema.index({ organization: 1, category: 1 });

export const MfgDocument = model<IMfgDocument>('MfgDocument', schema);
