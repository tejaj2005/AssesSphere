import { geminiGenerateJSON } from '../adapters/gemini';
import { QUALITY_EXPERT } from '../system-prompts';
import { ProcessedDocument } from '../document-processor';

const STANDARDS: Record<string, string> = {
  ISO_9001_2015: 'ISO 9001:2015 Quality Management Systems',
  GMP: 'Good Manufacturing Practice (GMP)',
  GLP: 'Good Laboratory Practice (GLP)',
  GDP: 'Good Distribution Practice (GDP)',
  GCP: 'Good Clinical Practice (GCP)',
  HIPAA: 'HIPAA Health Information Privacy',
  FDA_21_CFR_PART_11: 'FDA 21 CFR Part 11 Electronic Records',
};

export async function performGapAnalysis(
  document: ProcessedDocument,
  standard: string
): Promise<Record<string, any>> {
  const standardLabel = STANDARDS[standard] || standard;

  const prompt = `Perform a comprehensive gap analysis of the following document against ${standardLabel}.

Document: ${document.fileName} (${document.wordCount} words${document.pageCount ? `, ${document.pageCount} pages` : ''})

DOCUMENT CONTENT:
---
${document.text}
---

Analyze every section for compliance gaps. Return this exact JSON structure:
{
  "standard": "${standard}",
  "overallComplianceScore": <number 0-100>,
  "missingControls": [
    { "controlId": "<string>", "requirement": "<string>", "gap": "<string>", "riskImpact": "HIGH|MEDIUM|LOW", "recommendation": "<string>" }
  ],
  "nonCompliantClauses": [
    { "clause": "<string>", "requirement": "<string>", "currentState": "<string>", "gap": "<string>" }
  ],
  "weakAreas": [
    { "area": "<string>", "observation": "<string>", "improvementSuggestion": "<string>" }
  ],
  "strengths": ["<string>"],
  "prioritizedActionPlan": [
    { "action": "<string>", "priority": <1-10>, "effort": "LOW|MEDIUM|HIGH", "timelineWeeks": <number> }
  ],
  "documentSummary": "<string>"
}`;

  return await geminiGenerateJSON(QUALITY_EXPERT, prompt, 4096);
}
