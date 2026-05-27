import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (c: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Checkbox = ({ checked, onCheckedChange, disabled, className, id }: CheckboxProps) => (
  <button
    type="button"
    role="checkbox"
    id={id}
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-input ring-offset-background flex items-center justify-center transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      checked && 'bg-accent border-accent text-accent-foreground',
      className
    )}
  >
    {checked && <Check className="h-3 w-3" />}
  </button>
);
