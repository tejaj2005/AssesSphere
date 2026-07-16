import { Schema, model, Document } from 'mongoose';

export interface IAICopilotSession extends Document {
  userId: string;
  messages: Array<{ role: string; content: string; timestamp: Date }>;
  lastMessageAt: Date;
}

const schema = new Schema<IAICopilotSession>({
  userId: { type: String, required: true, index: true },
  messages: [{
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
  }],
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const AICopilotSession = model<IAICopilotSession>('AICopilotSession', schema);
