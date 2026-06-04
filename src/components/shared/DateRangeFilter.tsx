import { CalendarDays, X } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { cn } from '@/lib/utils';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const now = () => new Date();

interface Preset { key: string; label: string; range: () => [string, string]; }

const PRESETS: Preset[] = [
  { key: 'today',   label: 'Today',        range: () => [iso(now()), iso(now())] },
  { key: '7d',      label: '7D',           range: () => [iso(subDays(now(), 6)), iso(now())] },
  { key: '30d',     label: '30D',          range: () => [iso(subDays(now(), 29)), iso(now())] },
  { key: 'month',   label: 'This Month',   range: () => [iso(startOfMonth(now())), iso(endOfMonth(now()))] },
  { key: 'quarter', label: 'This Quarter', range: () => [iso(startOfQuarter(now())), iso(endOfQuarter(now()))] },
];

interface DateRangeFilterProps {
  from: string;
  to?: string;
  onChange: (from: string, to: string) => void;
  /** When true, only a single "from this date" field is shown (presets set the from bound). */
  singleDate?: boolean;
  className?: string;
}

export const DateRangeFilter = ({ from, to = '', onChange, singleDate, className }: DateRangeFilterProps) => {
  const activeKey = PRESETS.find((p) => {
    const [f, t] = p.range();
    return singleDate ? from === f : from === f && to === t;
  })?.key;
  const hasValue = !!from || !!to;

  const applyPreset = (p: Preset) => {
    const [f, t] = p.range();
    onChange(f, singleDate ? '' : t);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="inline-flex items-center gap-2 rounded-lg border border-input bg-card h-10 px-2.5">
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          aria-label={singleDate ? 'Date' : 'From date'}
          className="bg-transparent text-sm text-foreground outline-none w-[118px] [color-scheme:light] dark:[color-scheme:dark]"
        />
        {!singleDate && (
          <>
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => onChange(from, e.target.value)}
              aria-label="To date"
              className="bg-transparent text-sm text-foreground outline-none w-[118px] [color-scheme:light] dark:[color-scheme:dark]"
            />
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p)}
            className={cn('px-2.5 py-1 rounded-full text-xs border transition-colors',
              activeKey === p.key
                ? 'bg-accent text-accent-foreground border-accent'
                : 'border-input text-muted-foreground hover:text-foreground hover:border-accent/50')}
          >
            {p.label}
          </button>
        ))}
        {hasValue && (
          <button type="button" onClick={() => onChange('', '')} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-destructive transition-colors">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
};
