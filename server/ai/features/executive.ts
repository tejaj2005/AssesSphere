import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { REPORT_WRITER } from '../system-prompts';

export async function generateExecutiveSummary(dashboardData: {
  totalInspections: number;
  approvalRate: number;
  openFindings: number;
  criticalFindings: number;
  supplierCount: number;
  avgRiskScore: number;
  period: string;
  organizationId: string;
}): Promise<Record<string, any>> {
  const cacheKey = buildCacheKey('executive', dashboardData.organizationId, dashboardData.period);
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return cached;

  const prompt = `Generate an executive quality dashboard summary for ${dashboardData.period}.

Key metrics:
- Total inspections: ${dashboardData.totalInspections}
- Approval rate: ${dashboardData.approvalRate}%
- Open findings: ${dashboardData.openFindings} (${dashboardData.criticalFindings} critical)
- Suppliers monitored: ${dashboardData.supplierCount}
- Average risk score: ${dashboardData.avgRiskScore}/100

Return JSON:
{
  "headline": string (one powerful summary sentence),
  "overallHealthStatus": "EXCELLENT|GOOD|ATTENTION_NEEDED|CRITICAL",
  "executiveSummary": string (2-3 sentences),
  "topConcerns": [string],
  "positiveHighlights": [string],
  "immediateActions": [string],
  "qualityMaturityIndex": number (0-100),
  "trendDirection": "IMPROVING|STABLE|DECLINING"
}`;

  const result = await geminiGenerateJSON(REPORT_WRITER, prompt, 1024);
  await setCached(cacheKey, result);
  return result;
}
