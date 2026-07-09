import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { QUALITY_EXPERT } from '../system-prompts';

export interface BenchmarkEntity {
  id: string;
  name: string;
  type: string;
  complianceScore: number;
  totalInspections: number;
  failureRate: number;
  capaClosureRate: number;
  avgFindingsPerInspection: number;
}

export function rankEntities(entities: BenchmarkEntity[]): Array<BenchmarkEntity & { rank: number; performanceCategory: string }> {
  const sorted = [...entities].sort((a, b) => {
    const scoreA = (a.complianceScore * 0.4) + ((1 - a.failureRate) * 40) + (a.capaClosureRate * 0.2);
    const scoreB = (b.complianceScore * 0.4) + ((1 - b.failureRate) * 40) + (b.capaClosureRate * 0.2);
    return scoreB - scoreA;
  });

  return sorted.map((entity, index) => ({
    ...entity,
    rank: index + 1,
    performanceCategory:
      index < sorted.length * 0.25 ? 'TOP_PERFORMER'
      : index < sorted.length * 0.5 ? 'GOOD'
      : index < sorted.length * 0.75 ? 'AVERAGE'
      : 'NEEDS_IMPROVEMENT',
  }));
}

export async function generateBenchmarkSummary(
  entities: BenchmarkEntity[],
  entityType: string
): Promise<Record<string, any>> {
  const cacheKey = buildCacheKey('benchmark', entityType, entities.map(e => e.id).join(','));
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return cached;

  const ranked = rankEntities(entities);
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  const avgScore = Math.round(entities.reduce((s, e) => s + e.complianceScore, 0) / entities.length);

  const prompt = `Generate a benchmarking summary for ${entities.length} ${entityType}s.

Top performer: ${top.name} (compliance: ${top.complianceScore}%, failure rate: ${(top.failureRate * 100).toFixed(1)}%)
Bottom performer: ${bottom.name} (compliance: ${bottom.complianceScore}%, failure rate: ${(bottom.failureRate * 100).toFixed(1)}%)
Portfolio average compliance score: ${avgScore}%

Return JSON:
{
  "summary": string,
  "portfolioHealthScore": number (0-100),
  "keyInsights": [string],
  "actionableRecommendations": [string],
  "performanceGapAnalysis": string
}`;

  const result = await geminiGenerateJSON(QUALITY_EXPERT, prompt, 1024);
  await setCached(cacheKey, result);
  return { ...result, rankings: ranked };
}
