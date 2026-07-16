import { createContext, useContext, useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TabsContextType { value: string; setValue: (v: string) => void; }
const TabsContext = createContext<TabsContextType | null>(null);

export const Tabs = ({ defaultValue, value: ctrl, onValueChange, children, className }: { defaultValue?: string; value?: string; onValueChange?: (v: string) => void; children: ReactNode; className?: string; }) => {
  const [internal, setInternal] = useState(defaultValue || '');
  const value = ctrl !== undefined ? ctrl : internal;
  const setValue = (v: string) => { if (ctrl === undefined) setInternal(v); onValueChange?.(v); };
  return <TabsContext.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsContext.Provider>;
};

export const TabsList = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('inline-flex h-10 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground', className)}>{children}</div>
);

export const TabsTrigger = ({ value, children, className }: { value: string; children: ReactNode; className?: string }) => {
  const ctx = useContext(TabsContext)!;
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={cn(
        'relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'text-foreground' : 'hover:text-foreground',
        className
      )}
    >
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute inset-0 bg-background shadow-sm rounded-md"
          transition={{ type: 'spring', duration: 0.4 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export const TabsContent = ({ value, children, className }: { value: string; children: ReactNode; className?: string }) => {
  const ctx = useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={cn('mt-4', className)}>
      {children}
    </motion.div>
  );
};
