import { useState, useCallback } from 'react';
import { getToken } from '@/lib/api';

export const AI_BASE = import.meta.env.VITE_AI_API_URL || 'http://localhost:3001/api/ai';

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface AIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAICall<TInput = any, TOutput = any>(endpoint: string) {
  const [state, setState] = useState<AIState<TOutput>>({ data: null, loading: false, error: null });

  const execute = useCallback(async (input: TInput, formData?: FormData): Promise<TOutput | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = formData
        ? await fetch(`${AI_BASE}/${endpoint}`, { method: 'POST', body: formData, headers: authHeaders() })
        : await fetch(`${AI_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(input),
          });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data as TOutput;
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI request failed';
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, [endpoint]);

  const reset = useCallback(() => setState({ data: null, loading: false, error: null }), []);

  return { ...state, execute, reset };
}

/**
 * Streams the Groq-backed Copilot response. Calls onToken for each text chunk
 * and resolves when the stream ends. Returns an abort function.
 */
export async function streamCopilot(
  payload: { messages: Array<{ role: string; content: string }>; context: Record<string, any> },
  handlers: { onToken: (t: string) => void; onError?: (m: string) => void; onDone?: () => void },
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${AI_BASE}/copilot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    handlers.onError?.(`Copilot request failed: ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  const finish = () => { if (!finished) { finished = true; handlers.onDone?.(); } };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const evt of events) {
      const line = evt.trim();
      if (!line.startsWith('data:')) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        const parsed = JSON.parse(json);
        if (parsed.type === 'text') handlers.onToken(parsed.content);
        else if (parsed.type === 'error') handlers.onError?.(parsed.message || 'Copilot error');
        else if (parsed.type === 'done') finish();
      } catch {
        /* ignore partial/non-JSON frames */
      }
    }
  }
  // Fallback for a connection that ends without ever sending an explicit 'done' frame.
  finish();
}

export const useAIFindings = () => useAICall('findings');
export const useAICapa = () => useAICall('capa');
export const useAIReport = () => useAICall('report');
export const useAIRiskScore = () => useAICall('risk-score');
export const useAIGapAnalysis = () => useAICall('gap-analysis');
export const useAIEvidenceValidation = () => useAICall('validate-evidence');
export const useAIDocumentIntel = () => useAICall('document-intel');
export const useAIQualityScore = () => useAICall('quality-score');
export const useAIScheduling = () => useAICall('scheduling');
export const useAIMaturity = () => useAICall('maturity');
export const useAIPrediction = () => useAICall('predict');
export const useAIBenchmark = () => useAICall('benchmark');
export const useAIExecutiveSummary = () => useAICall('executive-summary');
export const useAIChecklist = () => useAICall('checklist');
