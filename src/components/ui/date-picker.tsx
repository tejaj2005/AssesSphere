/**
 * Themed calendar date-picker.
 *
 * Replaces the browser-native `<input type="date">` (whose calendar popup and
 * icon are unstyleable and read poorly on dark surfaces) with a fully
 * token-driven popover calendar that has correct contrast in both light and
 * dark themes. Value is exchanged as an ISO `yyyy-MM-dd` string so it is a
 * drop-in replacement for the native control.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, parse, isValid, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday,
} from 'date-fns';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  id?: string;
  /** Borderless trigger for embedding inside another bordered container. */
  bare?: boolean;
  className?: string;
}

const toDate = (v?: string): Date | null => {
  if (!v) return null;
  const d = parse(v, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : null;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker = ({ value, onChange, disabled, error, placeholder = 'Select date', id, bare, className }: DatePickerProps) => {
  const selected = toDate(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(selected || new Date());
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => { if (selected) setMonth(selected); }, [value]);

  // Position the (portalled) popover under the trigger and keep it in-viewport.
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = 280;
      let left = r.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      if (left < 8) left = 8;
      setPos({ top: r.bottom + 6, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (document.getElementById('datepicker-pop')?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });

  const pick = (d: Date) => { onChange(format(d, 'yyyy-MM-dd')); setOpen(false); };

  return (
    <div ref={wrapRef} className={cn('relative', bare ? 'inline-flex' : 'w-full', className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          bare
            ? 'bg-transparent text-foreground outline-none'
            : cn(
                'h-10 w-full rounded-lg border bg-background px-3 py-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-1',
                error ? 'border-destructive focus-visible:ring-destructive/25' : 'border-input',
              ),
        )}
      >
        {!bare && <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
          {selected ? format(selected, 'dd MMM yyyy') : placeholder}
        </span>
      </button>

      {open && createPortal(
        <div
          id="datepicker-pop"
          style={{ top: pos.top, left: pos.left, width: 280 }}
          className="fixed z-[100] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl shadow-black/20"
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setMonth((m) => subMonths(m, 1))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">{format(month, 'MMMM yyyy')}</span>
            <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="h-7 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const isSel = selected && isSameDay(d, selected);
              const inMonth = isSameMonth(d, month);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => pick(d)}
                  className={cn(
                    'h-8 w-full rounded-md text-xs font-medium transition-colors',
                    isSel
                      ? 'bg-accent text-accent-foreground'
                      : cn(
                          'hover:bg-muted',
                          inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                          !isSel && isToday(d) && 'ring-1 ring-inset ring-accent/60',
                        ),
                  )}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button type="button" onClick={() => pick(new Date())} className="text-xs font-medium text-accent hover:underline">Today</button>
            {selected && (
              <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Clear</button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
