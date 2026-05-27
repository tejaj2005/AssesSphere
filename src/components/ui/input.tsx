import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition-colors',
        'placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-1 focus-visible:border-brand-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error ? 'border-destructive focus-visible:ring-destructive/25' : 'border-input',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
