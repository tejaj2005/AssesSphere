import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { drawerTransition } from '@/lib/animations';

interface SheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  children: ReactNode;
  side?: 'right' | 'left';
  className?: string;
}

export const Sheet = ({ open, onOpenChange, children, side = 'right', className }: SheetProps) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            variants={side === 'right' ? drawerTransition : { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } }}
            initial="initial" animate="animate" exit="exit"
            className={cn(
              'fixed top-0 z-50 h-full w-full sm:w-[520px] max-w-full bg-card shadow-2xl border-l flex flex-col',
              side === 'right' ? 'right-0' : 'left-0 border-l-0 border-r',
              className
            )}
          >
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 z-10 rounded-md p-1.5 opacity-70 transition-opacity hover:opacity-100 hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 p-6 border-b pr-12', className)} {...props} />
);
export const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
);
export const SheetDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
);
export const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto p-6', className)} {...props} />
);
export const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-end gap-2 border-t p-4 bg-card', className)} {...props} />
);
