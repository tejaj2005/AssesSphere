import Groq from 'groq-sdk';
import { Response } from 'express';

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Streams the completion to `res` as SSE and returns the full accumulated text so the
 * caller can persist it — CORS headers are left to the app-level `cors()` middleware in
 * server/index.ts, not set here (a hardcoded `*` here would silently defeat that origin
 * allowlist for this one streaming endpoint). */
export async function groqStreamToResponse(
  messages: GroqMessage[],
  res: Response,
  maxTokens = 1024
): Promise<string> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let full = '';
  try {
    const stream = await groqClient.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.5,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        full += text;
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Groq error';
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
  } finally {
    res.end();
  }
  return full;
}
