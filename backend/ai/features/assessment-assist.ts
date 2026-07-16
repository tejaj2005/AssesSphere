import { geminiGenerateJSON } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { QUALITY_EXPERT } from '../system-prompts';

const STANDARD_LABELS: Record<string, string> = {
  ISO_9001_2015: 'ISO 9001:2015',
  GMP: 'Good Manufacturing Practice',
  GLP: 'Good Laboratory Practice',
  GDP: 'Good Distribution Practice',
  GCP: 'Good Clinical Practice',
  HIPAA: 'HIPAA',
  FDA_21_CFR_PART_11: 'FDA 21 CFR Part 11',
};

export async function generateAssessmentChecklist(
  standard: string,
  organization: string,
  productType?: string,
  processType?: string
): Promise<Record<string, any>> {
  // Without this, a request that drops `standard` (e.g. an unselected dropdown) silently
  // generated and cached a checklist "for undefined" for a full week (this feature uses the
  // longer checklist TTL), and every later caller that also omitted the field got that same
  // garbage result back as a normal 200 success.
  if (!standard) throw new Error('standard is required');
  const cacheKey = buildCacheKey('checklist', organization, standard, productType || '', processType || '');
  // A standard's checklist is effectively static reference material — cache it much longer
  // (default 1 week) than narrative content that should track changing business data.
  const checklistMaxAgeHours = parseInt(process.env.AI_CACHE_TTL_CHECKLIST_HOURS || '168');
  const cached = await getCached<Record<string, any>>(cacheKey, checklistMaxAgeHours);
  if (cached) return cached;

  const standardLabel = STANDARD_LABELS[standard] || standard;

  const prompt = `Generate a comprehensive assessment checklist for ${standardLabel}.
${productType ? `Product type: ${productType}` : ''}
${processType ? `Process type: ${processType}` : ''}

Return JSON:
{
  "standard": "${standard}",
  "standardFullName": "${standardLabel}",
  "totalQuestions": number,
  "sections": [
    {
      "sectionId": string,
      "sectionName": string,
      "clause": string,
      "questions": [
        {
          "id": string,
          "question": string,
          "evidenceRequired": string,
          "riskIfFailed": "CRITICAL|HIGH|MEDIUM|LOW",
          "guidance": string
        }
      ]
    }
  ],
  "estimatedDurationHours": number
}`;

  const result = await geminiGenerateJSON(QUALITY_EXPERT, prompt, 4096);
  await setCached(cacheKey, result);
  return result;
}
