import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Portal-based dropdown menu.
 *
 * The menu is rendered into <body> with fixed positioning computed from the
 * trigger's bounding box, so it is never clipped by an ancestor's `overflow`
 * (e.g. the DataTable's horizontal scroll container) — which previously made
 * the 3-dot action menus on lower table rows appear "broken".
 */
export const Dropdown = ({ trigger, children, align = 'right', className }: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const menuW = menuRef.current?.offsetWidth || 200;
    const menuH = menuRef.current?.offsetHeight || 0;
    let left = align === 'right' ? r.right - menuW : r.left;
    if (left < 8) left = 8;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    // Flip above the trigger if there isn't room below.
    let top = r.bottom + 4;
    if (menuH && top + menuH > window.innerHeight - 8 && r.top - menuH - 4 > 8) top = r.top - menuH - 4;
    setPos({ top, left });
  }, [align]);

  useEffect(() => {
    if (!open) return;
    place();
    const id = requestAnimationFrame(place); // re-measure once the menu has mounted
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <div ref={triggerRef} className="inline-flex" onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{ top: pos.top, left: pos.left }}
              onClick={() => setOpen(false)}
              className={cn(
                'fixed z-[200] min-w-[190px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl shadow-black/10',
                className
              )}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export const DropdownItem = ({ className, danger, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) => (
  <button
    disabled={disabled}
    className={cn(
      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors',
      'text-foreground [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
      'hover:bg-accent/15 hover:text-foreground',
      'focus-visible:outline-none focus-visible:bg-accent/15',
      danger && 'text-destructive [&_svg]:text-destructive hover:bg-destructive/10 hover:text-destructive',
      disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-current',
      className
    )}
    {...props}
  />
);

export const DropdownSeparator = () => <div className="my-1 h-px bg-border" />;
