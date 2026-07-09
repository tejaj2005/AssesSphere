import Groq from 'groq-sdk';
import { Response } from 'express';

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function groqStreamToResponse(
  messages: GroqMessage[],
  res: Response,
  maxTokens = 1024
): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

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
}
