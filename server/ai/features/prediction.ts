import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { QUALITY_EXPERT } from '../system-prompts';

export async function generatePredictions(data: {
  entityId: string;
  entityType: string;
  entityName: string;
  historicalTrend: Array<{ period: string; score: number; findings: number }>;
  currentRiskScore: number;
}): Promise<Record<string, any>> {
  const cacheKey = buildCacheKey('prediction', data.entityId);
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return cached;

  const trend = data.historicalTrend;
  const isWorsening = trend.length >= 2 && trend[trend.length - 1].score < trend[0].score;
  const avgFindings = trend.length > 0
    ? Math.round(trend.reduce((s, t) => s + t.findings, 0) / trend.length)
    : 0;

  const prompt = `Generate compliance predictions for ${data.entityType}: ${data.entityName}

Current risk score: ${data.currentRiskScore}/100
Historical trend (last ${trend.length} periods): ${JSON.stringify(trend)}
Trend direction: ${isWorsening ? 'WORSENING' : 'STABLE/IMPROVING'}
Average findings per period: ${avgFindings}

Return JSON:
{
  "auditFindingLikelihood": "HIGH|MEDIUM|LOW",
  "predictedRiskScore30Days": number,
  "predictedRiskScore90Days": number,
  "highRiskAreas": [string],
  "capaFailureProbability": "HIGH|MEDIUM|LOW",
  "repeatNonconformityRisk": [string],
  "earlyWarnings": [string],
  "recommendedPreventiveActions": [string],
  "confidenceLevel": "HIGH|MEDIUM|LOW"
}`;

  const result = await geminiGenerateJSON(QUALITY_EXPERT, prompt);
  await setCached(cacheKey, result);
  return result;
}
