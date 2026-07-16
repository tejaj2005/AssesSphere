import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  productId: string;
  description?: string;
  category?: string;
  specifications: Record<string, any>;
  components: Types.ObjectId[];
  manufacturingStages: Types.ObjectId[];
  assemblyStages: Types.ObjectId[];
  status: 'ACTIVE' | 'DISCONTINUED' | 'DEVELOPMENT';
  organization: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IProduct>({
  name:               { type: String, required: true, trim: true },
  productId:          String,
  description:        String,
  category:           String,
  specifications:     { type: Schema.Types.Mixed, default: {} },
  components:         [{ type: Schema.Types.ObjectId, ref: 'Component' }],
  manufacturingStages:[{ type: Schema.Types.ObjectId, ref: 'ManufacturingStage' }],
  assemblyStages:     [{ type: Schema.Types.ObjectId, ref: 'AssemblyStage' }],
  status:             { type: String, enum: ['ACTIVE','DISCONTINUED','DEVELOPMENT'], default: 'ACTIVE' },
  organization:       { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy:          { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.pre('save', function () {
  if (!this.productId) {
    const prefix = this.name.substring(0, 3).toUpperCase();
    this.productId = `PRD-${prefix}-${Date.now().toString().slice(-5)}`;
  }
});

schema.index({ organization: 1, status: 1 });
schema.index({ name: 'text', description: 'text' });
// Auto-generated codes are only unique within their own org's sequence (see the frontend's
// nextId() helper) — a global unique index would reject a second organization's first product
// the moment it also happened to be assigned "PRD-..." matching another org's existing code.
schema.index({ organization: 1, productId: 1 }, { unique: true, sparse: true });

export const Product = model<IProduct>('Product', schema);
