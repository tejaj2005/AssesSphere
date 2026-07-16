import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AICopilotPanel, CopilotSystemContext } from './AICopilotPanel';
import { cn } from '@/lib/utils';

interface Props {
  systemContext: CopilotSystemContext;
  /** Show a pulsing ring to draw attention (e.g. unread/insight available). */
  hasUnread?: boolean;
}

export const GlobalCopilotButton = ({ systemContext, hasUnread }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI Compliance Copilot"
          className={cn(
            'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full',
            'bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95',
          )}
        >
          {hasUnread && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
          )}
          <Sparkles className="relative h-6 w-6" />
        </button>
      )}
      <AICopilotPanel isOpen={open} onClose={() => setOpen(false)} systemContext={systemContext} />
    </>
  );
};
