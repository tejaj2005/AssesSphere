import { geminiGenerateJSON, geminiGenerateWithImage, extractJSON } from '../adapters/gemini';
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
    // geminiGenerateWithImage doesn't force JSON output mode the way geminiGenerateJSON does,
    // so the model is more likely to prepend prose before the JSON — a bare JSON.parse threw on
    // that instead of falling back the way extractJSON (used by every other text-path feature)
    // already does, by locating the first/last brace instead of assuming the string is pure JSON.
    return extractJSON(text);
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
