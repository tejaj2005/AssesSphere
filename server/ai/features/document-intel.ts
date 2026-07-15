import { geminiGenerateJSON, geminiGenerateWithImage, extractJSON } from '../adapters/gemini';
import { DOCUMENT_ANALYST } from '../system-prompts';
import { ProcessedDocument } from '../document-processor';

const RESPONSE_SCHEMA = `{
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

export async function analyzeDocument(file: ProcessedDocument): Promise<Record<string, any>> {
  // Image uploads (accepted by the same multer filter as any other document) have no extracted
  // text — file.text is always '' for them — so building a text prompt from it silently sent
  // an empty CONTENT block to Gemini, which then hallucinated a plausible-looking result instead
  // of ever actually looking at the image. Route images through the vision-capable call instead.
  if (file.isImage && file.base64 && file.mimeType) {
    const prompt = `Analyze this document image and extract key information.\n\nReturn exactly this JSON: ${RESPONSE_SCHEMA}`;
    const text = await geminiGenerateWithImage(DOCUMENT_ANALYST, prompt, file.base64, file.mimeType);
    return extractJSON(text);
  }

  const prompt = `Analyze this document and extract key information.

Document: ${file.fileName} (${file.wordCount} words)

CONTENT:
---
${file.text}
---

Return exactly this JSON: ${RESPONSE_SCHEMA}`;

  return await geminiGenerateJSON(DOCUMENT_ANALYST, prompt);
}
