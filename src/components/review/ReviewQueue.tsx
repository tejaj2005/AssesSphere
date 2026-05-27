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
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import type { InspectionRecord, ReviewStatus } from '@/types';

interface ReviewQueueProps {
  records: InspectionRecord[];
}

export const ReviewQueue = ({ records }: ReviewQueueProps) => {
  const { reviewInspectionRecord } = useData();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ rec: InspectionRecord; action: 'REJECTED' | 'INFO_REQUESTED' } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const approve = async (rec: InspectionRecord) => {
    setBusy(rec.id);
    await new Promise((r) => setTimeout(r, 250));
    reviewInspectionRecord(rec.id, 'APPROVED', '', user?.name || 'PM');
    toast.success('Report approved and sent to Quality Manager');
    setBusy(null);
  };

  const submitComment = async () => {
    if (!pendingAction) return;
    if (comment.trim().length < 10) { toast.error('Comment must be at least 10 characters'); return; }
    setBusy(pendingAction.rec.id);
    await new Promise((r) => setTimeout(r, 250));
    reviewInspectionRecord(pendingAction.rec.id, pendingAction.action, comment.trim(), user?.name || 'PM');
    toast.success(pendingAction.action === 'REJECTED' ? 'Report rejected with comments' : 'Information requested from inspector');
    setComment(''); setPendingAction(null); setBusy(null);
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
                      <p className="font-semibold">{rec.productName}</p>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-sm">{rec.stageName || rec.componentName || rec.materialName || rec.parameterName}</span>
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
                              <tr>
                                <td className="px-3 py-2 font-medium">{rec.parameterName}</td>
                                <td className="px-3 py-2 text-center">{rec.targetValue} {rec.unit}</td>
                                <td className="px-3 py-2 text-center">{rec.actualValue} {rec.unit}</td>
                                <td className={cn('px-3 py-2 text-center font-mono', rec.status === 'RED' && 'text-red-600', rec.status === 'AMBER' && 'text-amber-600', rec.status === 'GREEN' && 'text-emerald-600')}>{rec.variance.toFixed(2)}%</td>
                                <td className="px-3 py-2 text-center"><RAGBadge status={rec.status} /></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {rec.observations && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observations</p><p className="text-sm">{rec.observations}</p></div>}
                        {rec.equipmentUsed && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Equipment Used</p><p className="text-sm">{rec.equipmentUsed}</p></div>}
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
                          <p className="text-xs text-muted-foreground pt-2 border-t">Reviewed by <span className="font-medium">{rec.reviewedBy}</span> on {formatDate(rec.reviewedDate!)}</p>
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
