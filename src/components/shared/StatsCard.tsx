import { useEffect, useState } from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { hover } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  to?: string;
  variant?: 'default' | 'warning' | 'success' | 'danger' | 'accent';
}

export const StatsCard = ({ label, value, icon: Icon, to, variant = 'default' }: StatsCardProps) => {
  const navigate = useNavigate();
  const [display, setDisplay] = useState(0);
  const mv = useMotionValue(0);

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: 'easeOut' });
    const unsub = mv.on('change', (v) => setDisplay(Math.round(v)));
    return () => { controls.stop(); unsub(); };
  }, [value, mv]);

  const variantStyles = {
    default: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    warning: 'bg-status-amber-50 text-status-amber-600 dark:bg-status-amber-500/10 dark:text-status-amber-500',
    success: 'bg-status-green-50 text-status-green-600 dark:bg-status-green-500/10 dark:text-status-green-500',
    danger: 'bg-status-red-50 text-status-red-600 dark:bg-status-red-500/10 dark:text-status-red-500',
    accent: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
  }[variant];

  return (
    <motion.div whileHover={to ? hover.lift : undefined}>
      <div
        onClick={to ? () => navigate(to) : undefined}
        className={cn(
          'min-h-[88px] p-5 rounded-xl border border-border/60 bg-card shadow-card transition-shadow duration-200',
          to && 'cursor-pointer hover:shadow-card-hover'
        )}
      >
        <div className="flex items-start justify-between">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', variantStyles)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          {to && <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="mt-3">
          <div className="text-[28px] font-semibold tracking-tight tabular-nums leading-tight">{display}</div>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </motion.div>
  );
};
