import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { streamCopilot } from '@/hooks/useAI';

export interface CopilotSystemContext {
  userRole: string;
  activeProduct?: string;
  pendingApprovals?: number;
  openFindings?: number;
  recentInspections?: Array<{ id: string; product: string; stage: string; status: string; date: string }>;
  supplierSummary?: Array<{ name: string; riskLevel: string; lastEvaluation: string }>;
}

interface Message { role: 'user' | 'assistant'; content: string; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  systemContext: CopilotSystemContext;
}

const QUICK_ACTIONS = [
  'Show high-risk suppliers',
  'Summarize open findings',
  "What's overdue this month?",
  'Which products need inspection?',
];

const MAX_MESSAGES = 20;

export const AICopilotPanel = ({ isOpen, onClose, systemContext }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;

    const history = [...messages, { role: 'user' as const, content }].slice(-MAX_MESSAGES);
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamCopilot(
        { messages: history, context: systemContext },
        {
          onToken: (t) =>
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: next[next.length - 1].content + t };
              return next;
            }),
          onError: (m) =>
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: `⚠️ ${m}` };
              return next;
            }),
        },
        controller.signal,
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, systemContext]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[400px] max-w-full flex-col border-l border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">AI Compliance Copilot</p>
                  <p className="text-[11px] text-muted-foreground">Powered by Groq</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close copilot">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Ask about inspections, findings, suppliers, or compliance status.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {QUICK_ACTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors hover:bg-accent/15 hover:text-accent"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary text-secondary-foreground rounded-bl-sm',
                    )}
                  >
                    {m.content || (streaming && i === messages.length - 1 ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                      </span>
                    ) : '')}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Ask the copilot…"
                  className="max-h-32 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
                <Button size="icon" onClick={() => send(input)} disabled={streaming || !input.trim()} aria-label="Send">
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                AI Generated · Verify important details in AssessSphere.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
