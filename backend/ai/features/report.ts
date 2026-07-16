import crypto from 'crypto';
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
  organization: string;
  period: { from: string; to: string };
  kpis?: Record<string, any>;
  summaryData?: any;
}): Promise<Record<string, any>> {
  // A substring of the stringified payload only ever captures whatever fits in the first N
  // characters — for a report body, that's reportType/period/organization before kpis/
  // summaryData (the fields that actually distinguish one report from another) ever appear, so
  // two materially different reports for the same type/period/org would hash identically and
  // collide. Hash the full payload instead, so every byte of it affects the key.
  const dataHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 24);
  const cacheKey = buildCacheKey('report', data.organization, data.reportType, dataHash);
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
