import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { QUALITY_EXPERT } from '../system-prompts';

export interface AssessmentInput {
  assessmentId: string;
  organization: string;
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
  // completeness has no upper bound of its own (answeredQuestions can exceed totalQuestions on
  // a data-entry mistake, since nothing upstream validates that) — clamp the final weighted
  // score the same way calculateFormulaScore in risk-score.ts already does, so a bad input can't
  // produce a "quality score" outside the documented 0-100 range.
  const overall = Math.min(Math.round((completeness * 0.4) + (evidenceScore * 0.35) + (capaScore * 0.25)), 100);

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

  const cacheKey = buildCacheKey('quality-score', input.organization, input.assessmentId);
  // Only these fields ever come from the LLM — its JSON is otherwise unconstrained, and the
  // prompt below restates the formula score/maturity as context, which models commonly echo
  // straight back into structured output. Without a whitelist that would silently overwrite the
  // deterministically-computed overallScore/maturityLevel with an unvalidated LLM value.
  const pickNarrative = (n: Record<string, any>) => ({
    strengths: n.strengths,
    areasForImprovement: n.areasForImprovement,
    benchmarkNote: n.benchmarkNote,
  });
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return { ...formulaResult, ...pickNarrative(cached) };

  const prompt = `Evaluate this assessment quality:

Completion: ${formulaResult.completenessScore}%
Evidence-to-finding ratio: ${(input.evidenceCount / Math.max(input.findingsCount, 1)).toFixed(2)}
CAPA coverage: ${(input.capaCount / Math.max(input.findingsCount, 1) * 100).toFixed(0)}%
Checklist completion: ${input.checklistCompletionRate}%
Formula score: ${formulaResult.overallScore}/100, Maturity: ${formulaResult.maturityLevel}

Return JSON: { "strengths": [string], "areasForImprovement": [string], "benchmarkNote": string }`;

  const narrative = await geminiGenerateJSON(QUALITY_EXPERT, prompt, 1024);
  await setCached(cacheKey, narrative);
  return { ...formulaResult, ...pickNarrative(narrative) };
}
