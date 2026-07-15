import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { QUALITY_EXPERT } from '../system-prompts';

export async function assessMaturity(orgData: {
  totalInspections: number;
  averageComplianceScore: number;
  capaClosureRate: number;
  documentedProcesses: number;
  auditFrequency: string;
  organizationId: string;
}): Promise<Record<string, any>> {
  const cacheKey = buildCacheKey('maturity', orgData.organizationId);
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return cached;

  // Each dimension's worst tier contributes 0, not 1 — with a minimum of 1 per dimension the
  // total could never drop below 3, making levelIndex 0 ("INITIAL") literally unreachable: even
  // an organization with the worst possible compliance, CAPA closure, and inspection volume
  // would always be classified as at least "MANAGED".
  let score = 0;
  if (orgData.averageComplianceScore >= 90) score += 3;
  else if (orgData.averageComplianceScore >= 70) score += 2;
  else if (orgData.averageComplianceScore >= 40) score += 1;
  if (orgData.capaClosureRate >= 90) score += 3;
  else if (orgData.capaClosureRate >= 70) score += 2;
  else if (orgData.capaClosureRate >= 40) score += 1;
  if (orgData.totalInspections >= 100) score += 2;
  else if (orgData.totalInspections >= 20) score += 1;

  const maturityLevels = ['INITIAL', 'MANAGED', 'DEFINED', 'QUANTITATIVELY_MANAGED', 'OPTIMIZING'];
  const levelIndex = Math.min(Math.floor(score / 2), 4);

  const prompt = `Assess organizational quality maturity:

Total inspections: ${orgData.totalInspections}
Average compliance: ${orgData.averageComplianceScore}%
CAPA closure rate: ${orgData.capaClosureRate}%
Documented processes: ${orgData.documentedProcesses}
Audit frequency: ${orgData.auditFrequency}
Preliminary maturity level: ${maturityLevels[levelIndex]}

Return JSON:
{
  "currentLevel": "${maturityLevels[levelIndex]}",
  "levelScore": ${score},
  "description": string,
  "strengthAreas": [string],
  "gapAreas": [string],
  "nextLevelName": "${maturityLevels[Math.min(levelIndex + 1, 4)]}",
  "roadmapToNextLevel": [{ "action": string, "timelineMonths": number, "effort": "LOW|MEDIUM|HIGH" }],
  "estimatedTimeToNextLevel": string
}`;

  const result = await geminiGenerateJSON(QUALITY_EXPERT, prompt);
  // Unlike risk-score.ts/quality-score.ts, this used to return the raw LLM JSON with nothing
  // computed locally merged back in — if the model didn't faithfully echo the prompt's
  // pre-filled currentLevel/levelScore (or dropped a field), that became the maturity
  // assessment with no way to detect the mismatch. Force the deterministically-computed values
  // back over whatever the model returned.
  const merged = {
    ...result,
    currentLevel: maturityLevels[levelIndex],
    levelScore: score,
    nextLevelName: maturityLevels[Math.min(levelIndex + 1, 4)],
  };
  await setCached(cacheKey, merged);
  return merged;
}
