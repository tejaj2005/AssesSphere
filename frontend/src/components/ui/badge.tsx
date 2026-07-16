import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground border-border',
        success: 'border-transparent bg-success/15 text-success dark:bg-success/20',
        warning: 'border-transparent bg-warning/15 text-warning dark:bg-warning/20',
        danger: 'border-transparent bg-danger/15 text-danger dark:bg-danger/20',
        accent: 'border-transparent bg-accent/15 text-accent',
        purple: 'border-transparent bg-purple-500/15 text-purple-600 dark:text-purple-400',
        teal: 'border-transparent bg-teal-500/15 text-teal-600 dark:text-teal-400',
        slate: 'border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
export { badgeVariants };
