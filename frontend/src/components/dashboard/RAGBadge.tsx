import { CheckCircle2, AlertTriangle, XCircle, Clock, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RAGStatus, ReviewStatus } from '@/types';

/**
 * Status display badge. Per project policy, raw color names (Green/Amber/Red)
 * never appear in UI — they're mapped to semantic keywords:
 *   GREEN → Good · AMBER → Warning · RED → Critical
 */
const STATUS_KEYWORD: Record<RAGStatus, string> = { GREEN: 'Good', AMBER: 'Warning', RED: 'Critical' };

export const RAGBadge = ({ status, label }: { status: RAGStatus; label?: string }) => {
  const map = {
    GREEN: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', icon: CheckCircle2 },
    AMBER: { cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', icon: AlertTriangle },
    RED:   { cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20', icon: XCircle },
  }[status];
  const Icon = map.icon;
  const text = label ?? STATUS_KEYWORD[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium', map.cls)}>
      <Icon className="h-3 w-3" /> {text}
    </span>
  );
};

export const ReviewBadge = ({ status }: { status: ReviewStatus }) => {
  const reviewMap: Record<ReviewStatus, { cls: string; icon: any; txt: string }> = {
    APPROVED: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400', icon: CheckCircle2, txt: 'Approved' },
    REJECTED: { cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400', icon: XCircle, txt: 'Rejected' },
    PENDING:  { cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400', icon: Clock, txt: 'Pending' },
    INFO_REQUESTED: { cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400', icon: FileEdit, txt: 'Info Requested' },
  };
  const map = reviewMap[status];
  const Icon = map.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium', map.cls)}>
      <Icon className="h-3 w-3" /> {map.txt}
    </span>
  );
};
