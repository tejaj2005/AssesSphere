import { cva } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Circle as CircleIcon, FileEdit } from 'lucide-react';
import { urgentPulse } from '@/lib/animations';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border',
  {
    variants: {
      status: {
        green:    'bg-status-green-50 text-status-green-700 border-status-green-200 dark:bg-status-green-500/10 dark:text-status-green-500 dark:border-status-green-500/20',
        amber:    'bg-status-amber-50 text-status-amber-700 border-status-amber-200 dark:bg-status-amber-500/10 dark:text-status-amber-500 dark:border-status-amber-500/20',
        red:      'bg-status-red-50 text-status-red-700 border-status-red-200 dark:bg-status-red-500/10 dark:text-status-red-500 dark:border-status-red-500/20',
        active:   'bg-status-green-50 text-status-green-700 border-status-green-200 dark:bg-status-green-500/10 dark:text-status-green-500 dark:border-status-green-500/20',
        inactive: 'bg-surface-tertiary text-ink-muted border-surface-muted dark:bg-muted dark:text-muted-foreground dark:border-border',
        draft:    'bg-surface-tertiary text-ink-muted border-surface-muted dark:bg-muted dark:text-muted-foreground dark:border-border',
        pending:  'bg-status-amber-50 text-status-amber-700 border-status-amber-200 dark:bg-status-amber-500/10 dark:text-status-amber-500 dark:border-status-amber-500/20',
        completed:'bg-status-green-50 text-status-green-700 border-status-green-200 dark:bg-status-green-500/10 dark:text-status-green-500 dark:border-status-green-500/20',
      },
    },
    defaultVariants: { status: 'inactive' },
  }
);

interface StatusBadgeProps {
  status: 'Active' | 'Inactive' | 'COMPLETED' | 'PENDING' | string;
  className?: string;
  pulse?: boolean;
}

export const StatusBadge = ({ status, className, pulse }: StatusBadgeProps) => {
  const variant = (() => {
    switch (status) {
      case 'Active': case 'COMPLETED': return 'active';
      case 'Inactive': return 'inactive';
      case 'PENDING': return 'pending';
      default: return 'draft';
    }
  })() as any;
  const Icon = (() => {
    if (status === 'Active' || status === 'COMPLETED') return CheckCircle2;
    if (status === 'PENDING') return Clock;
    return CircleIcon;
  })();
  const label = status === 'COMPLETED' ? 'Completed' : status === 'PENDING' ? 'Pending' : status;
  return (
    <motion.span {...(pulse && status === 'PENDING' ? { variants: urgentPulse, animate: 'animate' } : {})} className={cn(badgeVariants({ status: variant }), className)}>
      <Icon className="h-3 w-3" />
      {label}
    </motion.span>
  );
};
