import { geminiGenerateWithTool } from '../adapters/gemini';
import { getCached, setCached, buildCacheKey } from '../cache';
import { QUALITY_EXPERT } from '../system-prompts';
import { FunctionDeclaration } from '@google/generative-ai';

export interface InspectionChecklistItem {
  parameter: string;
  specificationValue: string;
  actualValue: string;
  result: 'PASS' | 'FAIL' | 'MARGINAL';
  observations?: string;
}

export interface InspectionInput {
  inspectionReportId: string;
  productName: string;
  inspectionType: string;
  stage: string;
  checklistItems: InspectionChecklistItem[];
  equipment?: string[];
  inspector?: string;
  inspectionDate?: string;
}

const FINDINGS_TOOL: FunctionDeclaration = {
  name: 'generate_findings',
  description: 'Generate structured inspection findings',
  parameters: {
    type: 'object' as any,
    properties: {
      nonConformities: {
        type: 'array' as any,
        items: {
          type: 'object' as any,
          properties: {
            findingId: { type: 'string' as any },
            severity: { type: 'string' as any, enum: ['CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION'] },
            description: { type: 'string' as any },
            affectedParameter: { type: 'string' as any },
            standardReference: { type: 'string' as any },
            immediateAction: { type: 'string' as any },
          },
          required: ['findingId', 'severity', 'description', 'affectedParameter'],
        },
      },
      opportunitiesForImprovement: {
        type: 'array' as any,
        items: {
          type: 'object' as any,
          properties: {
            area: { type: 'string' as any },
            recommendation: { type: 'string' as any },
            potentialBenefit: { type: 'string' as any },
          },
        },
      },
      positiveFindings: { type: 'array' as any, items: { type: 'string' as any } },
      overallAssessment: { type: 'string' as any },
      executiveSummary: { type: 'string' as any },
      confidenceScore: { type: 'number' as any },
    },
    required: ['nonConformities', 'opportunitiesForImprovement', 'positiveFindings', 'overallAssessment', 'executiveSummary', 'confidenceScore'],
  },
};

export async function generateFindings(input: InspectionInput): Promise<Record<string, any>> {
  const cacheKey = buildCacheKey('findings', input.inspectionReportId);
  const cached = await getCached<Record<string, any>>(cacheKey);
  if (cached) return cached;

  const failedItems = input.checklistItems.filter(i => i.result !== 'PASS');
  const prompt = `Analyze this inspection and generate findings:

Product: ${input.productName}
Inspection Type: ${input.inspectionType}
Stage: ${input.stage}
Date: ${input.inspectionDate || 'Not specified'}
Inspector: ${input.inspector || 'Not specified'}
Equipment: ${input.equipment?.join(', ') || 'Not specified'}

CHECKLIST (${input.checklistItems.length} items, ${failedItems.length} failed):
${input.checklistItems.map((item, i) =>
  `${i + 1}. ${item.parameter} | Spec: ${item.specificationValue} | Actual: ${item.actualValue} | Result: ${item.result}${item.observations ? ` | Note: ${item.observations}` : ''}`
).join('\n')}

Generate structured findings. Use IDs: NC-001, NC-002, OFI-001 etc. Reference ISO 9001 clauses where applicable.`;

  const result = await geminiGenerateWithTool(QUALITY_EXPERT, prompt, FINDINGS_TOOL);
  await setCached(cacheKey, result);
  return result;
}
