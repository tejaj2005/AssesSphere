import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { QUALITY_EXPERT } from '../system-prompts';

export interface RiskInput {
  entityType: 'SUPPLIER' | 'PRODUCT' | 'PROCESS' | 'DEPARTMENT' | 'SITE';
  entityId: string;
  entityName: string;
  totalInspections: number;
  failedInspections: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  capaOpenCount: number;
  capaOverdueCount: number;
  lastInspectionDate?: string;
  complianceScore?: number;
}

export function calculateFormulaScore(input: RiskInput): number {
  if (input.totalInspections === 0) return 50;

  const failureRate = input.failedInspections / input.totalInspections;
  const criticalWeight = input.criticalFindings * 3;
  const majorWeight = input.majorFindings * 2;
  const minorWeight = input.minorFindings * 1;
  const totalFindingWeight = Math.min(criticalWeight + majorWeight + minorWeight, 30);
  const capaOverdueRatio = input.capaOpenCount > 0 ? input.capaOverdueCount / input.capaOpenCount : 0;
  const compliancePenalty = input.complianceScore ? (100 - input.complianceScore) * 0.1 : 5;

  const score = (failureRate * 40) + totalFindingWeight + (capaOverdueRatio * 20) + compliancePenalty;
  return Math.min(Math.round(score), 100);
}

export function getRiskLevel(score: number): string {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

export async function generateRiskScore(
  input: RiskInput,
  withNarrative = false
): Promise<Record<string, any>> {
  const formulaScore = calculateFormulaScore(input);
  const riskLevel = getRiskLevel(formulaScore);

  const baseResult = {
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    overallScore: formulaScore,
    riskLevel,
    complianceRisk: Math.round(formulaScore * 0.4),
    operationalRisk: Math.round(formulaScore * 0.35),
    entitySpecificRisk: Math.round(formulaScore * 0.25),
    calculatedAt: new Date().toISOString(),
    formulaBased: true,
  };

  if (!withNarrative) return baseResult;

  const cacheKey = buildCacheKey('risk-narrative', input.entityType, input.entityId);
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return { ...baseResult, ...cached, formulaBased: false };

  const prompt = `Provide a concise risk narrative for this ${input.entityType}:

Entity: ${input.entityName}
Calculated Risk Score: ${formulaScore}/100 (${riskLevel})
Failed inspections: ${input.failedInspections}/${input.totalInspections}
Critical findings: ${input.criticalFindings}, Major: ${input.majorFindings}
Overdue CAPAs: ${input.capaOverdueCount}/${input.capaOpenCount}

Return JSON:
{
  "trendDirection": "WORSENING|STABLE|IMPROVING",
  "riskNarrative": "<2-3 sentence professional narrative>",
  "topRiskFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "mitigationPriorities": ["<action 1>", "<action 2>"],
  "nextReviewRecommendation": "<string>"
}`;

  const narrative = await geminiGenerateJSON(QUALITY_EXPERT, prompt);
  await setCached(cacheKey, narrative);
  return { ...baseResult, ...narrative, formulaBased: false };
}
