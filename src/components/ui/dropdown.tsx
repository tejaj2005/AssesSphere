import { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown = ({ trigger, children, align = 'right', className }: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            className={cn(
              'absolute z-50 mt-1 min-w-[180px] rounded-lg border bg-popover p-1 shadow-lg',
              align === 'right' ? 'right-0' : 'left-0',
              className
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DropdownItem = ({ className, danger, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) => (
  <button
    disabled={disabled}
    className={cn(
      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
      'text-foreground',
      'hover:bg-accent/15 hover:text-foreground',
      'focus-visible:outline-none focus-visible:bg-accent/15',
      danger && 'text-destructive hover:bg-destructive/10 hover:text-destructive',
      disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-current',
      className
    )}
    {...props}
  />
);

export const DropdownSeparator = () => <div className="my-1 h-px bg-border" />;
