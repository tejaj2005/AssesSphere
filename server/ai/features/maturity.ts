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

  let score = 0;
  if (orgData.averageComplianceScore >= 90) score += 3;
  else if (orgData.averageComplianceScore >= 70) score += 2;
  else score += 1;
  if (orgData.capaClosureRate >= 90) score += 3;
  else if (orgData.capaClosureRate >= 70) score += 2;
  else score += 1;
  if (orgData.totalInspections >= 100) score += 2;
  else score += 1;

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
  await setCached(cacheKey, result);
  return result;
}
