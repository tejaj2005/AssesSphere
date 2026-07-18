import { groqStreamToResponse, GroqMessage } from '../adapters/groq';
import { COPILOT_BASE } from '../system-prompts';
import { AICopilotSession } from '../../models/AICopilotSession';
import { Response } from 'express';
import { Supplier } from '../../models/Supplier';
import { InspectionReport } from '../../models/InspectionReport';
import { SupplierEvaluation } from '../../models/SupplierEvaluation';
import { CalibrationRecord } from '../../models/CalibrationRecord';

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
      lines.push(`- ${i.product} | Stage/StageTitle: ${i.stage} | Status: ${i.status} | Date: ${i.date}`)
    );
  }

  if (context.supplierSummary?.length) {
    lines.push('\nSupplier overview (Roster/Risk):');
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
  userId?: string,
  orgId?: string
): Promise<void> {
  // Dynamically load real-time context from the database if orgId is available
  if (orgId) {
    try {
      const [pendingReports, pendingEvals, pendingCalibrations, openReports, recent, suppliers] = await Promise.all([
        InspectionReport.countDocuments({ organization: orgId as any, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
        SupplierEvaluation.countDocuments({ organization: orgId as any, reviewStatus: 'PENDING' }),
        CalibrationRecord.countDocuments({ organization: orgId as any, approvalStatus: 'PENDING' }),
        InspectionReport.countDocuments({ organization: orgId as any, status: { $in: ['REJECTED', 'ON_HOLD'] } }),
        InspectionReport.find({ organization: orgId as any })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate({ path: 'plan', select: 'title' }),
        Supplier.find({ organization: orgId as any })
          .sort({ overallRating: 1 })
          .limit(10)
      ]);

      context.pendingApprovals = pendingReports + pendingEvals + pendingCalibrations;
      context.openFindings = openReports;
      context.recentInspections = recent.map((r: any) => ({
        id: String(r._id),
        product: r.plan?.title || 'Unknown Inspection',
        stage: r.plan?.title || 'Unknown Stage',
        status: r.status,
        date: r.inspectionDate ? new Date(r.inspectionDate).toLocaleDateString() : 'Unknown Date',
      }));
      context.supplierSummary = suppliers.map((s: any) => ({
        name: s.name,
        riskLevel: s.overallRating < 5 ? 'High' : s.overallRating < 8 ? 'Medium' : 'Low',
        lastEvaluation: s.lastEvaluationDate ? new Date(s.lastEvaluationDate).toLocaleDateString() : 'Never',
      }));
    } catch (err) {
      console.error('[Copilot Context Fetch Error]', err);
    }
  }

  const systemMessage = buildSystemMessage(context);

  const messages: GroqMessage[] = [
    { role: 'system', content: systemMessage },
    ...conversationHistory.slice(-10).map(m => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const assistantReply = await groqStreamToResponse(messages, res);

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

