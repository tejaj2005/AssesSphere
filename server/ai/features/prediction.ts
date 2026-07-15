import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { QUALITY_EXPERT } from '../system-prompts';

export async function generatePredictions(data: {
  entityId: string;
  entityType: string;
  organization: string;
  entityName: string;
  historicalTrend: Array<{ period: string; score: number; findings: number }>;
  currentRiskScore: number;
}): Promise<Record<string, any>> {
  // entityId alone isn't a safe cache key — the frontend derives it by slugifying the entity
  // name, not a DB id, so two differently-typed entities that happen to share a name (e.g. a
  // SUPPLIER and a PROCESS both called "Line 1") would collide and one gets served the other's
  // predictions. entityType and organization both have to be part of the key.
  const cacheKey = buildCacheKey('prediction', data.organization, data.entityType, data.entityId);
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
