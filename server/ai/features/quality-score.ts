import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { QUALITY_EXPERT } from '../system-prompts';

export interface AssessmentInput {
  assessmentId: string;
  totalQuestions: number;
  answeredQuestions: number;
  evidenceCount: number;
  findingsCount: number;
  capaCount: number;
  checklistCompletionRate: number;
  durationHours?: number;
}

export function calculateQualityScore(input: AssessmentInput): Record<string, any> {
  const completeness = Math.round((input.answeredQuestions / Math.max(input.totalQuestions, 1)) * 100);
  const evidenceRatio = Math.min(input.evidenceCount / Math.max(input.findingsCount, 1), 2);
  const capaRatio = Math.min(input.capaCount / Math.max(input.findingsCount, 1), 1);
  const evidenceScore = Math.round(Math.min(evidenceRatio * 50, 100));
  const capaScore = Math.round(capaRatio * 100);
  const overall = Math.round((completeness * 0.4) + (evidenceScore * 0.35) + (capaScore * 0.25));

  let maturityLevel = 'INITIAL';
  if (overall >= 85) maturityLevel = 'OPTIMIZING';
  else if (overall >= 70) maturityLevel = 'QUANTITATIVELY_MANAGED';
  else if (overall >= 55) maturityLevel = 'DEFINED';
  else if (overall >= 40) maturityLevel = 'MANAGED';

  return {
    overallScore: overall,
    completenessScore: completeness,
    evidenceQualityScore: evidenceScore,
    capaAdequacyScore: capaScore,
    maturityLevel,
    formulaBased: true,
  };
}

export async function scoreAssessmentWithNarrative(
  input: AssessmentInput
): Promise<Record<string, any>> {
  const formulaResult = calculateQualityScore(input);

  const cacheKey = buildCacheKey('quality-score', input.assessmentId);
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return { ...formulaResult, ...cached };

  const prompt = `Evaluate this assessment quality:

Completion: ${formulaResult.completenessScore}%
Evidence-to-finding ratio: ${(input.evidenceCount / Math.max(input.findingsCount, 1)).toFixed(2)}
CAPA coverage: ${(input.capaCount / Math.max(input.findingsCount, 1) * 100).toFixed(0)}%
Checklist completion: ${input.checklistCompletionRate}%
Formula score: ${formulaResult.overallScore}/100, Maturity: ${formulaResult.maturityLevel}

Return JSON: { "strengths": [string], "areasForImprovement": [string], "benchmarkNote": string }`;

  const narrative = await geminiGenerateJSON(QUALITY_EXPERT, prompt, 1024);
  await setCached(cacheKey, narrative);
  return { ...formulaResult, ...narrative };
}
