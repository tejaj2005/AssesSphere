import { groqStreamToResponse, GroqMessage } from '../adapters/groq';
import { COPILOT_BASE } from '../system-prompts';
import { AICopilotSession } from '../../models/AICopilotSession';
import { Response } from 'express';

export interface CopilotContext {
  userRole: string;
  activeProduct?: string;
  pendingApprovals?: number;
  openFindings?: number;
  recentInspections?: Array<{ id: string; product: string; stage: string; status: string; date: string }>;
  supplierSummary?: Array<{ name: string; riskLevel: string; lastEvaluation: string }>;
}

function buildSystemMessage(context: CopilotContext): string {
  const lines: string[] = [COPILOT_BASE, `\nCURRENT USER: Role: ${context.userRole}`];

  if (context.activeProduct) lines.push(`Active product: ${context.activeProduct}`);
  if (context.pendingApprovals !== undefined) lines.push(`Pending approvals: ${context.pendingApprovals}`);
  if (context.openFindings !== undefined) lines.push(`Open findings: ${context.openFindings}`);

  if (context.recentInspections?.length) {
    lines.push('\nRecent inspections:');
    context.recentInspections.forEach(i =>
      lines.push(`- ${i.product} | ${i.stage} | ${i.status} | ${i.date}`)
    );
  }

  if (context.supplierSummary?.length) {
    lines.push('\nSupplier overview:');
    context.supplierSummary.forEach(s =>
      lines.push(`- ${s.name}: Risk=${s.riskLevel}, Last eval=${s.lastEvaluation}`)
    );
  }

  return lines.join('\n');
}

export async function streamCopilotResponse(
  conversationHistory: Array<{ role: string; content: string }>,
  context: CopilotContext,
  res: Response,
  userId?: string
): Promise<void> {
  const systemMessage = buildSystemMessage(context);

  const messages: GroqMessage[] = [
    { role: 'system', content: systemMessage },
    ...conversationHistory.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const assistantReply = await groqStreamToResponse(messages, res);

  // Fire-and-forget: persisting the exchange isn't on the response's critical path (the
  // stream has already ended by the time this runs), and a DB hiccup here shouldn't surface
  // as a chat error to the user.
  if (userId) {
    const lastUserMessage = conversationHistory[conversationHistory.length - 1];
    const toAppend = [
      ...(lastUserMessage ? [{ role: lastUserMessage.role, content: lastUserMessage.content, timestamp: new Date() }] : []),
      ...(assistantReply ? [{ role: 'assistant', content: assistantReply, timestamp: new Date() }] : []),
    ];
    if (toAppend.length) {
      AICopilotSession.findOneAndUpdate(
        { userId },
        { $push: { messages: { $each: toAppend, $slice: -40 } }, $set: { lastMessageAt: new Date() } },
        { upsert: true }
      ).catch(() => { /* session persistence failure is non-fatal */ });
    }
  }
}
