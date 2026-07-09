import { geminiGenerateWithTool } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { CAPA_EXPERT } from '../system-prompts';
import { FunctionDeclaration } from '@google/generative-ai';

const CAPA_TOOL: FunctionDeclaration = {
  name: 'generate_capa',
  description: 'Generate CAPA recommendations for a quality finding',
  parameters: {
    type: 'object' as any,
    properties: {
      rootCauses: {
        type: 'array' as any,
        items: {
          type: 'object' as any,
          properties: {
            cause: { type: 'string' as any },
            methodology: { type: 'string' as any },
            likelihood: { type: 'string' as any, enum: ['HIGH', 'MEDIUM', 'LOW'] },
          },
        },
      },
      correctiveActions: {
        type: 'array' as any,
        items: {
          type: 'object' as any,
          properties: {
            action: { type: 'string' as any },
            responsibleDepartment: { type: 'string' as any },
            targetDays: { type: 'number' as any },
            priority: { type: 'string' as any, enum: ['IMMEDIATE', 'SHORT_TERM', 'LONG_TERM'] },
          },
        },
      },
      preventiveActions: {
        type: 'array' as any,
        items: {
          type: 'object' as any,
          properties: {
            action: { type: 'string' as any },
            responsibleDepartment: { type: 'string' as any },
            targetDays: { type: 'number' as any },
            expectedOutcome: { type: 'string' as any },
          },
        },
      },
      effectivenessVerification: {
        type: 'object' as any,
        properties: {
          method: { type: 'string' as any },
          criteria: { type: 'string' as any },
          verificationDate: { type: 'string' as any },
        },
      },
      estimatedRiskReduction: { type: 'number' as any },
    },
    required: ['rootCauses', 'correctiveActions', 'preventiveActions', 'effectivenessVerification', 'estimatedRiskReduction'],
  },
};

export async function generateCapa(input: {
  findingId: string;
  severity: string;
  description: string;
  affectedParameter: string;
  productName?: string;
  stage?: string;
  frequency?: number;
}): Promise<Record<string, any>> {
  const cacheKey = buildCacheKey('capa', input.findingId);
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return cached;

  const prompt = `Generate CAPA recommendations for:

Finding ID: ${input.findingId}
Severity: ${input.severity}
Product: ${input.productName || 'Not specified'}
Stage: ${input.stage || 'Not specified'}
Description: ${input.description}
Affected Parameter: ${input.affectedParameter}
${input.frequency ? `Recurrence: This type of NC has occurred ${input.frequency} times — treat as systemic.` : ''}

Apply 5-Why and Fishbone methodologies. Prioritize IMMEDIATE actions for CRITICAL/MAJOR findings.`;

  const result = await geminiGenerateWithTool(CAPA_EXPERT, prompt, CAPA_TOOL);
  await setCached(cacheKey, result);
  return result;
}
