import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { REPORT_WRITER } from '../system-prompts';

const REPORT_TYPES: Record<string, string> = {
  EXECUTIVE_SUMMARY: 'Executive Quality Summary Report',
  DETAILED_ASSESSMENT: 'Detailed Assessment Report',
  RISK_REPORT: 'Compliance Risk Report',
  CAPA_STATUS: 'CAPA Status and Effectiveness Report',
  SUPPLIER_EVALUATION: 'Supplier Evaluation Summary Report',
  MANAGEMENT_REVIEW: 'Management Review Report',
};

export async function generateReport(data: {
  reportType: string;
  period: { from: string; to: string };
  organization?: string;
  kpis?: Record<string, any>;
  summaryData?: any;
}): Promise<Record<string, any>> {
  const dataHash = JSON.stringify(data).substring(0, 100).replace(/\s/g, '');
  const cacheKey = buildCacheKey('report', data.reportType, dataHash);
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return cached;

  const reportLabel = REPORT_TYPES[data.reportType] || data.reportType;

  const prompt = `Generate a professional ${reportLabel} for ${data.period.from} to ${data.period.to}.

${data.organization ? `Organization: ${data.organization}` : ''}
${data.kpis ? `KPIs: ${JSON.stringify(data.kpis, null, 2)}` : ''}
${data.summaryData ? `Data: ${JSON.stringify(data.summaryData, null, 2)}` : ''}

Return exactly this JSON:
{
  "title": string,
  "reportDate": string,
  "period": string,
  "executiveSummary": string,
  "sections": [{ "heading": string, "content": string, "keyPoints": [string] }],
  "conclusions": string,
  "recommendations": [string],
  "appendixNotes": string
}`;

  const result = await geminiGenerateJSON(REPORT_WRITER, prompt, 4096);
  await setCached(cacheKey, result);
  return result;
}
