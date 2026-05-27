import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare, ChevronDown, Calendar, User as UserIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { RAGBadge, ReviewBadge } from '@/components/dashboard/RAGBadge';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import type { MaterialReceivedPlan, ReviewStatus } from '@/types';

export const ReviewMaterialReports = () => {
  const { materialPlans, suppliers, materials, reviewMaterialPlan } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [matFilter, setMatFilter] = useState('all');
  const [supFilter, setSupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('PENDING');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ plan: MaterialReceivedPlan; action: 'REJECTED' | 'INFO_REQUESTED' } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => materialPlans.filter((p) => {
    if (search && !(p.materialName + p.supplierName + p.planCode).toLowerCase().includes(search.toLowerCase())) return false;
    if (matFilter !== 'all' && p.materialId !== matFilter) return false;
    if (supFilter !== 'all' && p.supplierId !== supFilter) return false;
    if (statusFilter !== 'all' && p.reviewStatus !== statusFilter) return false;
    return p.overallStatus !== 'DRAFT';
  }), [materialPlans, search, matFilter, supFilter, statusFilter]);

  const approve = async (p: MaterialReceivedPlan) => {
    setBusy(p.id);
    await new Promise((r) => setTimeout(r, 250));
    reviewMaterialPlan(p.id, 'APPROVED', '', user?.name || 'SM');
    toast.success('Material cleared for stores');
    setBusy(null);
  };

  const submitComment = async () => {
    if (!pendingAction) return;
    if (comment.trim().length < 10) { toast.error('Min 10 characters required'); return; }
    setBusy(pendingAction.plan.id);
    await new Promise((r) => setTimeout(r, 250));
    reviewMaterialPlan(pendingAction.plan.id, pendingAction.action, comment.trim(), user?.name || 'SM');
    if (pendingAction.action === 'REJECTED') toast.success('Material quarantined — supplier return triggered');
    else toast.success('Information requested from inspector');
    setComment(''); setPendingAction(null); setBusy(null);
  };

  const exportRows = filtered.map((p) => ({ Plan: p.planCode, Material: p.materialName, Supplier: p.supplierName, Quantity: `${p.quantity} ${p.unit}`, Status: p.overallStatus, Review: p.reviewStatus }));

  return (
    <PageWrapper>
      <PageHeader title="Review Material Inspection Reports" description="Approve, reject or request more info on submitted material reports." action={<ExportButtons data={exportRows} fileName="material-reviews" />} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <Select value={matFilter} onChange={setMatFilter} options={[{ label: 'All Materials', value: 'all' }, ...materials.map((m) => ({ label: m.name, value: m.id }))]} className="w-44" />
        <Select value={supFilter} onChange={setSupFilter} options={[{ label: 'All Suppliers', value: 'all' }, ...suppliers.map((s) => ({ label: s.name, value: s.id }))]} className="w-44" />
        <Select value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[{ label: 'All', value: 'all' }, { label: 'Pending', value: 'PENDING' }, { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' }, { label: 'Info Requested', value: 'INFO_REQUESTED' }]} className="w-44" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12"><EmptyState title="No reports to review" description="All caught up." /></Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <Card className={cn('overflow-hidden', p.parameters.some((pp) => pp.status === 'RED') && 'border-l-4 border-l-red-500')}>
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{p.materialName}</p>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-sm">{p.supplierName}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-sm font-mono">{p.quantity} {p.unit}</span>
                        <ReviewBadge status={p.reviewStatus} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                        <span>{p.planCode}</span>
                        <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" /> {p.inspectorName || '—'}</span>
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(p.date)}</span>
                      </p>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded === p.id && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {expanded === p.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-4 pt-0 border-t mt-2 space-y-3">
                          <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50"><tr><th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Parameter</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Target</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Actual</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Variance</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Status</th></tr></thead>
                              <tbody>
                                {p.parameters.map((pp) => (
                                  <tr key={pp.id} className="border-t">
                                    <td className="px-3 py-2 font-medium">{pp.parameterName}</td>
                                    <td className="px-3 py-2 text-center font-mono">{pp.targetValue} {pp.unit}</td>
                                    <td className="px-3 py-2 text-center font-mono">{pp.actualValue} {pp.unit}</td>
                                    <td className="px-3 py-2 text-center font-mono">{pp.variance?.toFixed(2)}%</td>
                                    <td className="px-3 py-2 text-center">{pp.status && <RAGBadge status={pp.status} />}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {p.observations && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observations</p><p className="text-sm">{p.observations}</p></div>}
                          {p.reviewComment && <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"><p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Review Comment</p><p className="text-sm">{p.reviewComment}</p></div>}
                          {p.reviewStatus === 'PENDING' && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                              <Button size="sm" variant="accent" disabled={busy === p.id} onClick={() => approve(p)}>{busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve</Button>
                              <Button size="sm" variant="destructive" disabled={busy === p.id} onClick={() => setPendingAction({ plan: p, action: 'REJECTED' })}><XCircle className="h-4 w-4" /> Reject</Button>
                              <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => setPendingAction({ plan: p, action: 'INFO_REQUESTED' })}><MessageSquare className="h-4 w-4" /> Request Info</Button>
                            </div>
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
      )}

      <Dialog open={!!pendingAction} onOpenChange={(o) => !o && (setPendingAction(null), setComment(''))}>
        <DialogHeader><DialogTitle>{pendingAction?.action === 'REJECTED' ? 'Reject Report' : 'Request Information'}</DialogTitle><DialogDescription>Provide a clear comment (min 10 chars).</DialogDescription></DialogHeader>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} autoFocus />
        <p className="text-[10px] text-muted-foreground mt-1">{comment.length}/10 minimum</p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setPendingAction(null); setComment(''); }}>Cancel</Button>
          <Button variant={pendingAction?.action === 'REJECTED' ? 'destructive' : 'accent'} onClick={submitComment} disabled={comment.trim().length < 10}>Submit</Button>
        </DialogFooter>
      </Dialog>
    </PageWrapper>
  );
};
