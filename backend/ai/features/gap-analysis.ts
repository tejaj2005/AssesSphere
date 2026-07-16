import { geminiGenerateJSON, geminiGenerateWithImage, extractJSON } from '../adapters/gemini';
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

  const schema = `{
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

  // Image uploads (accepted by the same multer filter as any other document) have no extracted
  // text — document.text is always '' for them — so this used to send an empty CONTENT block to
  // Gemini and get back a hallucinated compliance score/gap analysis with no indication that
  // nothing was actually read, and that fabricated score gets persisted to AIGapAnalysis.
  if (document.isImage && document.base64 && document.mimeType) {
    const prompt = `Perform a comprehensive gap analysis of this document image against ${standardLabel}.\n\nReturn this exact JSON structure: ${schema}`;
    const text = await geminiGenerateWithImage(QUALITY_EXPERT, prompt, document.base64, document.mimeType);
    return extractJSON(text);
  }

  const prompt = `Perform a comprehensive gap analysis of the following document against ${standardLabel}.

Document: ${document.fileName} (${document.wordCount} words${document.pageCount ? `, ${document.pageCount} pages` : ''})

DOCUMENT CONTENT:
---
${document.text}
---

Analyze every section for compliance gaps. Return this exact JSON structure: ${schema}`;

  return await geminiGenerateJSON(QUALITY_EXPERT, prompt, 4096);
}
