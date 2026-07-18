import Groq from 'groq-sdk';
import { Response } from 'express';
import type { ChatCompletionTool, ChatCompletionMessageToolCall } from 'groq-sdk/resources/chat';

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Widened beyond the original plain {role, content} shape so the copilot's tool-calling
// round trip can pass through an assistant turn that requested a tool (with its tool_calls)
// and the tool's own result message — both required by the Groq/OpenAI-style chat API to
// let the model narrate a confirmation of what it just did.
export type GroqChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ChatCompletionMessageToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string };

/** @deprecated use GroqChatMessage — kept so any stray import doesn't break at compile time. */
export type GroqMessage = GroqChatMessage;

export function beginSSE(res: Response): void {
  if (res.headersSent) return;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

export function writeSSE(res: Response, event: Record<string, any>): void {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/** Streams the completion to `res` as SSE and returns the full accumulated text so the
 * caller can persist it — CORS headers are left to the app-level `cors()` middleware in
 * backend/index.ts, not set here (a hardcoded `*` here would silently defeat that origin
 * allowlist for this one streaming endpoint). */
export async function groqStreamToResponse(
  messages: GroqChatMessage[],
  res: Response,
  maxTokens = 1024
): Promise<string> {
  beginSSE(res);

  let full = '';
  try {
    const stream = await groqClient.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: messages as any,
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.5,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        full += text;
        writeSSE(res, { type: 'text', content: text });
      }
    }

    writeSSE(res, { type: 'done' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Groq error';
    writeSSE(res, { type: 'error', message });
  } finally {
    if (!res.writableEnded) res.end();
  }
  return full;
}

export type GroqStreamWithToolsResult =
  | { mode: 'text'; fullText: string }
  | { mode: 'tool_calls'; calls: ChatCompletionMessageToolCall[]; rawAssistantContent: string | null };

/**
 * Streams a completion with `tools` attached from the start — deliberately NOT a
 * non-streaming "probe" call first, which would add full-response latency to every plain
 * chat message just to check whether a tool might be needed. Groq's streaming API supports
 * `tools` directly: plain-chat turns stream `delta.content` exactly like `groqStreamToResponse`
 * (zero regression for the common case), while a tool-call turn instead streams
 * `delta.tool_calls` fragments with no user-facing text at all (OpenAI-compatible semantics:
 * a turn is either prose or a tool call, never both) — so nothing is lost by trying the
 * streaming call first in either case.
 */
export async function groqStreamWithTools(
  messages: GroqChatMessage[],
  res: Response,
  tools: ChatCompletionTool[],
  maxTokens = 1024
): Promise<GroqStreamWithToolsResult> {
  beginSSE(res);

  let full = '';
  // Keyed by the streamed tool_call's `index`, not its `id` — Groq/OpenAI only send `id`/
  // `type`/(usually) the full `name` on the first delta for a given call, then stream
  // `function.arguments` as string fragments across subsequent deltas sharing that same
  // index. Concatenating by index (never overwriting) is required to reassemble valid JSON.
  const toolCallAcc: Record<number, { id?: string; name?: string; args: string }> = {};
  let finishReason: string | null = null;

  const stream = await groqClient.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: messages as any,
    tools: tools.length ? tools : undefined,
    tool_choice: tools.length ? 'auto' : undefined,
    stream: true,
    max_tokens: maxTokens,
    temperature: 0.5,
  });

  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    const delta = choice?.delta as any;

    if (delta?.content) {
      full += delta.content;
      writeSSE(res, { type: 'text', content: delta.content });
    }

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls as any[]) {
        const idx = tc.index ?? 0;
        if (!toolCallAcc[idx]) toolCallAcc[idx] = { args: '' };
        if (tc.id) toolCallAcc[idx].id = tc.id;
        if (tc.function?.name) toolCallAcc[idx].name = (toolCallAcc[idx].name || '') + tc.function.name;
        if (tc.function?.arguments) toolCallAcc[idx].args += tc.function.arguments;
      }
    }

    if (choice?.finish_reason) finishReason = choice.finish_reason;
  }

  if (finishReason === 'tool_calls') {
    const calls: ChatCompletionMessageToolCall[] = Object.values(toolCallAcc)
      .filter((c) => c.id && c.name)
      .map((c) => ({ id: c.id!, type: 'function', function: { name: c.name!, arguments: c.args } }));
    if (calls.length > 0) {
      return { mode: 'tool_calls', calls, rawAssistantContent: full || null };
    }
  }

  writeSSE(res, { type: 'done' });
  res.end();
  return { mode: 'text', fullText: full };
}
