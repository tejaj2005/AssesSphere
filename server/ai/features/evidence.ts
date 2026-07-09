import { geminiGenerateJSON, geminiGenerateWithImage } from '../adapters/gemini';
import { QUALITY_EXPERT } from '../system-prompts';
import { ProcessedDocument } from '../document-processor';

export async function validateEvidence(
  file: ProcessedDocument,
  assessmentQuestion: string,
  requirement: string
): Promise<Record<string, any>> {
  const jsonSchema = `{
  "isValid": boolean,
  "matchScore": number (0-100),
  "isComplete": boolean,
  "isCurrent": boolean,
  "issues": [{ "type": "MISMATCH|INCOMPLETE|OUTDATED|UNCLEAR|ADDITIONAL_REQUIRED", "description": string }],
  "additionalDocumentsRequired": [string],
  "validationSummary": string,
  "recommendation": "ACCEPT|ACCEPT_WITH_NOTE|REJECT|REQUEST_MORE"
}`;

  if (file.isImage && file.base64 && file.mimeType) {
    const prompt = `Validate this evidence image.

Assessment Question: ${assessmentQuestion}
Requirement: ${requirement}

Return exactly this JSON: ${jsonSchema}`;

    const text = await geminiGenerateWithImage(QUALITY_EXPERT, prompt, file.base64, file.mimeType);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  const prompt = `Validate the following evidence document.

Assessment Question: ${assessmentQuestion}
Requirement: ${requirement}

EVIDENCE (${file.fileName}):
---
${file.text}
---

Return exactly this JSON: ${jsonSchema}`;

  return await geminiGenerateJSON(QUALITY_EXPERT, prompt);
}
