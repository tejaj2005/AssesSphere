import { GoogleGenerativeAI, GenerativeModel, Part, FunctionDeclaration } from '@google/generative-ai';
import { assertGeminiQuotaAvailable } from '../quotaGuard';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export function getGeminiModel(modelName?: string): GenerativeModel {
  return genAI.getGenerativeModel({
    model: modelName || process.env.GEMINI_MODEL || 'gemini-flash-latest',
  });
}

export interface GeminiToolCall {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

// Newer Flash models (2.5-era, which `gemini-flash-latest` resolves to) spend
// "thinking" tokens against maxOutputTokens, which truncates JSON responses.
// Disabling the thinking budget keeps structured output intact and cheap.
const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } };

/** Extract a JSON object/array from a model response that may include prose or fences. */
export function extractJSON(text: string): Record<string, any> {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (err: any) {
    const start = clean.search(/[[{]/);
    if (start === -1) {
      throw new Error(`Model did not return valid JSON structure: ${clean.substring(0, 200)}`);
    }

    const isObject = clean[start] === '{';
    const openChar = clean[start];
    const closeChar = isObject ? '}' : ']';

    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let i = start; i < clean.length; i++) {
      const char = clean[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === openChar) {
          depth++;
        } else if (char === closeChar) {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
    }

    if (end !== -1) {
      try {
        return JSON.parse(clean.slice(start, end + 1));
      } catch (parseErr: any) {
        throw new Error(`Failed to parse balanced JSON: ${parseErr.message}\nContent: ${clean.slice(start, end + 1).substring(0, 200)}`);
      }
    }

    throw new Error(`Model did not return valid JSON: ${clean.substring(0, 200)}`);
  }
}


export async function geminiGenerate(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number }
): Promise<string> {
  await assertGeminiQuotaAvailable();
  const model = getGeminiModel();
  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
    ],
    generationConfig: {
      maxOutputTokens: options?.maxTokens || 4096,
      temperature: 0.3,
      ...NO_THINKING,
    } as any,
  });
  return result.response.text();
}

export async function geminiGenerateWithTool(
  systemPrompt: string,
  userPrompt: string,
  toolDeclaration: FunctionDeclaration
): Promise<Record<string, any>> {
  await assertGeminiQuotaAvailable();
  const model = getGeminiModel();
  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
    ],
    tools: [{ functionDeclarations: [toolDeclaration] }],
    toolConfig: { functionCallingConfig: { mode: 'ANY' as any } },
    generationConfig: { maxOutputTokens: 8192, temperature: 0.2, ...NO_THINKING } as any,
  });

  const candidate = result.response.candidates?.[0];
  const functionCall = candidate?.content?.parts?.find(p => p.functionCall);

  if (functionCall?.functionCall) {
    return functionCall.functionCall.args as Record<string, any>;
  }

  return extractJSON(result.response.text());
}

export async function geminiGenerateJSON(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<Record<string, any>> {
  await assertGeminiQuotaAvailable();
  const model = getGeminiModel();
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, no backticks.\n\n${userPrompt}` }],
    }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.2,
      responseMimeType: 'application/json',
      ...NO_THINKING,
    } as any,
  });

  return extractJSON(result.response.text());
}

export async function geminiGenerateWithImage(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  await assertGeminiQuotaAvailable();
  const model = getGeminiModel();
  const imagePart: Part = {
    inlineData: { data: imageBase64, mimeType: mimeType as any },
  };
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        imagePart,
        { text: `${systemPrompt}\n\n${userPrompt}` },
      ],
    }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.2, ...NO_THINKING } as any,
  });
  return result.response.text();
}
