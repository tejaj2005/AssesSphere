import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Option { label: string; value: string }

interface MultiSelectChipsProps {
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
  className?: string;
}

export const MultiSelectChips = ({ options, values, onChange, className }: MultiSelectChipsProps) => {
  const toggle = (v: string) => {
    if (values.includes(v)) onChange(values.filter((x) => x !== v));
    else onChange([...values, v]);
  };
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              selected
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-input hover:border-accent/50 hover:bg-accent/5'
            )}
          >
            {selected && <Check className="h-3 w-3" />}
            {opt.label}
          </button>
        );
      })}
      {options.length === 0 && <span className="text-xs text-muted-foreground">No options</span>}
    </div>
  );
};

export const TagChip = ({ children, variant = 'accent' }: { children: React.ReactNode; variant?: any }) => (
  <Badge variant={variant} className="text-[10px] py-0 h-5">{children}</Badge>
);
