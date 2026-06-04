import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft } from 'lucide-react';
import { NAV } from '@/components/layout/navConfig';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FlatItem { label: string; group: string; to: string; icon: any; }

const FLAT: FlatItem[] = NAV.flatMap((g) =>
  g.items.map((i) => ({ label: i.label, group: g.label || 'General', to: i.to, icon: i.icon }))
);

export const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FLAT;
    return FLAT.filter((i) => (i.label + ' ' + i.group).toLowerCase().includes(q));
  }, [query]);

  // Reset state + focus the input each time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  const select = (item?: FlatItem) => {
    const target = item || results[active];
    if (!target) return;
    onOpenChange(false);
    navigate(target.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); select(); }
    else if (e.key === 'Escape') { e.preventDefault(); onOpenChange(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-lg pointer-events-auto rounded-xl border bg-card shadow-2xl overflow-hidden"
              onKeyDown={onKeyDown}
            >
              <div className="flex items-center gap-2 px-4 border-b">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Jump to a page…"
                  className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">esc</kbd>
              </div>
              <div className="max-h-[55vh] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No matches for “{query}”.</p>
                ) : (
                  results.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.to}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => select(item)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                          i === active ? 'bg-accent/15 text-foreground' : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium text-foreground flex-1 truncate">{item.label}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.group}</span>
                        {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
