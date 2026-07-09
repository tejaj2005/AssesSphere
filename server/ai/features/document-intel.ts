import { geminiGenerateJSON } from '../adapters/gemini';
import { DOCUMENT_ANALYST } from '../system-prompts';
import { ProcessedDocument } from '../document-processor';

export async function analyzeDocument(file: ProcessedDocument): Promise<Record<string, any>> {
  const prompt = `Analyze this document and extract key information.

Document: ${file.fileName} (${file.wordCount} words)

CONTENT:
---
${file.text}
---

Return exactly this JSON:
{
  "documentType": "<SOP|Policy|Procedure|Certificate|Report|Checklist|Other>",
  "summary": "<2-3 sentence summary>",
  "keyInformation": [{ "field": string, "value": string }],
  "relevantStandards": [string],
  "complianceRelevance": "<HIGH|MEDIUM|LOW>",
  "missingElements": [string],
  "classification": "<CONFIDENTIAL|INTERNAL|PUBLIC>",
  "recommendedActions": [string],
  "qualityScore": <number 0-100>
}`;

  return await geminiGenerateJSON(DOCUMENT_ANALYST, prompt);
}
