import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare, ChevronDown, Calendar, User as UserIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RAGBadge, ReviewBadge } from '@/components/dashboard/RAGBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import type { RAGStatus, ReviewStatus } from '@/types';

/** One checklist parameter row from the report's `checklistResults[]`. */
export interface ReviewChecklistRow {
  parameter: string;
  targetValue: string;
  actualValue: string;
  variance: number;
  status: RAGStatus;
}

/** Client-side view of an InspectionReport, shaped for this queue's rendering.
 * Built by the parent page (ReviewReports.tsx) from the live `/inspection-reports` data —
 * see that file for the report → ReviewRecord mapping. */
export interface ReviewRecord {
  id: string;
  date: string;
  title: string;
  planCode?: string;
  rows: ReviewChecklistRow[];
  variance: number;
  status: RAGStatus;
  inspectorName: string;
  reviewStatus: ReviewStatus;
  observations?: string;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedDate?: string;
}

interface ReviewQueueProps {
  records: ReviewRecord[];
  /** Called after a successful approve/reject/hold so the parent can refetch. Awaited before
   * the busy lock releases, so the buttons stay disabled until `records` actually reflects the
   * new status — otherwise a second action (or a fast double-click) could fire against the same
   * report while the first mutation's refetch is still in flight, and whichever response lands
   * last silently wins. */
  onActionComplete?: () => void | Promise<unknown>;
}

export const ReviewQueue = ({ records, onActionComplete }: ReviewQueueProps) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ rec: ReviewRecord; action: 'REJECTED' | 'INFO_REQUESTED' } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const approve = async (rec: ReviewRecord) => {
    setBusy(rec.id);
    try {
      await api.put(`/inspection-reports/${rec.id}/approve`, { approvedBy: user?.id, reviewComments: '' });
      toast.success('Report approved and sent to Quality Manager');
      await onActionComplete?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const submitComment = async () => {
    if (!pendingAction) return;
    if (comment.trim().length < 10) { toast.error('Comment must be at least 10 characters'); return; }
    setBusy(pendingAction.rec.id);
    try {
      if (pendingAction.action === 'REJECTED') {
        await api.put(`/inspection-reports/${pendingAction.rec.id}/reject`, { reviewedBy: user?.id, rejectionReason: comment.trim() });
        toast.success('Report rejected with comments');
      } else {
        // Closest available backend status for "request more info" — the hold endpoint
        // doesn't persist a comment, so it's shown locally only via the toast.
        await api.put(`/inspection-reports/${pendingAction.rec.id}/hold`, {});
        toast.success('Information requested from inspector');
      }
      await onActionComplete?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setComment(''); setPendingAction(null); setBusy(null);
    }
  };

  if (records.length === 0) {
    return <Card className="p-12"><EmptyState title="No reports to review" description="All caught up — no inspection reports match the current filter." /></Card>;
  }

  return (
    <>
      <div className="space-y-3">
        <AnimatePresence>
          {records.map((rec) => (
            <motion.div key={rec.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Card className={cn('overflow-hidden transition-shadow hover:shadow-md', rec.status === 'RED' && 'border-l-4 border-l-red-500', rec.status === 'AMBER' && 'border-l-4 border-l-amber-500')}>
                <button onClick={() => setExpanded(expanded === rec.id ? null : rec.id)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{rec.title}</p>
                      {rec.planCode && <span className="text-xs text-muted-foreground font-mono">{rec.planCode}</span>}
                      <RAGBadge status={rec.status} />
                      <ReviewBadge status={rec.reviewStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" /> {rec.inspectorName}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(rec.date)}</span>
                      <span>Variance {rec.variance.toFixed(2)}%</span>
                    </p>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', expanded === rec.id && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {expanded === rec.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="p-4 pt-0 border-t mt-2 space-y-3">
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr><th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Parameter</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Target</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Actual</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Variance</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Status</th></tr>
                            </thead>
                            <tbody>
                              {rec.rows.map((row, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-medium">{row.parameter}</td>
                                  <td className="px-3 py-2 text-center">{row.targetValue}</td>
                                  <td className="px-3 py-2 text-center">{row.actualValue}</td>
                                  <td className={cn('px-3 py-2 text-center font-mono', row.status === 'RED' && 'text-red-600', row.status === 'AMBER' && 'text-amber-600', row.status === 'GREEN' && 'text-emerald-600')}>{row.variance.toFixed(2)}%</td>
                                  <td className="px-3 py-2 text-center"><RAGBadge status={row.status} /></td>
                                </tr>
                              ))}
                              {!rec.rows.length && (
                                <tr><td colSpan={5} className="px-3 py-3 text-center text-muted-foreground">No checklist results recorded.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {rec.observations && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observations</p><p className="text-sm">{rec.observations}</p></div>}
                        {rec.reviewComment && <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"><p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Previous Review Comment</p><p className="text-sm">{rec.reviewComment}</p></div>}

                        {rec.reviewStatus === 'PENDING' && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button size="sm" variant="accent" disabled={busy === rec.id} onClick={() => approve(rec)}>
                              {busy === rec.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve
                            </Button>
                            <Button size="sm" variant="destructive" disabled={busy === rec.id} onClick={() => setPendingAction({ rec, action: 'REJECTED' })}>
                              <XCircle className="h-4 w-4" /> Reject
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy === rec.id} onClick={() => setPendingAction({ rec, action: 'INFO_REQUESTED' })}>
                              <MessageSquare className="h-4 w-4" /> Request Info
                            </Button>
                          </div>
                        )}
                        {rec.reviewStatus !== 'PENDING' && rec.reviewedBy && (
                          <p className="text-xs text-muted-foreground pt-2 border-t">Reviewed by <span className="font-medium">{rec.reviewedBy}</span>{rec.reviewedDate && <> on {formatDate(rec.reviewedDate)}</>}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Dialog open={!!pendingAction} onOpenChange={(o) => !o && (setPendingAction(null), setComment(''))}>
        <DialogHeader>
          <DialogTitle>{pendingAction?.action === 'REJECTED' ? 'Reject Report' : 'Request More Information'}</DialogTitle>
          <DialogDescription>Provide a clear comment so the inspector understands what to address (min. 10 characters).</DialogDescription>
        </DialogHeader>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Explain the reason…" autoFocus />
        <p className="text-[10px] text-muted-foreground mt-1">{comment.length}/10 minimum</p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setPendingAction(null); setComment(''); }}>Cancel</Button>
          <Button variant={pendingAction?.action === 'REJECTED' ? 'destructive' : 'accent'} onClick={submitComment} disabled={comment.trim().length < 10}>
            {pendingAction?.action === 'REJECTED' ? 'Confirm Rejection' : 'Send Request'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
};
