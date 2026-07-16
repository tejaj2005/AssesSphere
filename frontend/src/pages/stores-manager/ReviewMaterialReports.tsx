import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare, ChevronDown, Calendar, User as UserIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { RAGBadge, ReviewBadge } from '@/components/dashboard/RAGBadge';
import { useApiResource } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import type { ReviewStatus, RAGStatus } from '@/types';

type ActionType = 'REJECTED' | 'INFO_REQUESTED';

/** Collapse the backend's report workflow status into the simpler review-status
 * vocabulary this page's UI (ReviewBadge, filters) was built around. */
const toReviewStatus = (status: string): ReviewStatus => {
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'ON_HOLD') return 'INFO_REQUESTED';
  return 'PENDING'; // SUBMITTED | UNDER_REVIEW
};

const resultToRAG = (result: string): RAGStatus | undefined => {
  if (result === 'PASS') return 'GREEN';
  if (result === 'MARGINAL') return 'AMBER';
  if (result === 'FAIL') return 'RED';
  return undefined;
};

export const ReviewMaterialReports = () => {
  const { user } = useAuth();
  const orgQuery = useMemo(() => ({ organization: user?.organization ?? '' }), [user?.organization]);
  const planQuery = useMemo(() => ({ organization: user?.organization ?? '', planType: 'R1_MATERIAL' }), [user?.organization]);

  const { items: reports, setItems: setReports, loading: reportsLoading } = useApiResource<any>('/inspection-reports', orgQuery);
  const { items: materialPlans, loading: plansLoading } = useApiResource<any>('/inspection-plans', planQuery);
  const { items: allSuppliers, loading: suppliersLoading } = useApiResource<any>('/admin/suppliers', orgQuery);

  const [search, setSearch] = useState('');
  const [matFilter, setMatFilter] = useState('all');
  const [supFilter, setSupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('PENDING');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: ActionType } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const planById = useMemo(() => Object.fromEntries(materialPlans.map((pl: any) => [pl.id, pl])), [materialPlans]);
  const supplierById = useMemo(() => Object.fromEntries(allSuppliers.map((s: any) => [s.id, s.name])), [allSuppliers]);

  const materialOptions = useMemo(() => {
    const seen = new Map<string, string>();
    materialPlans.forEach((pl: any) => { if (pl.material?._id) seen.set(pl.material._id, pl.material.name); });
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [materialPlans]);

  const rows = useMemo(() => reports
    .filter((r: any) => r.plan?.planType === 'R1_MATERIAL' && r.status !== 'DRAFT')
    .map((r: any) => {
      const plan = planById[r.plan?._id];
      return {
        report: r,
        plan,
        materialId: plan?.material?._id as string | undefined,
        materialName: plan?.material?.name || r.plan?.title || '—',
        supplierId: plan?.supplier as string | undefined,
        supplierName: plan?.supplier ? (supplierById[plan.supplier] || '—') : '—',
        reviewStatus: toReviewStatus(r.status),
      };
    }), [reports, planById, supplierById]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (search && !(row.materialName + row.supplierName + (row.report.reportId || '')).toLowerCase().includes(search.toLowerCase())) return false;
    if (matFilter !== 'all' && row.materialId !== matFilter) return false;
    if (supFilter !== 'all' && row.supplierId !== supFilter) return false;
    if (statusFilter !== 'all' && row.reviewStatus !== statusFilter) return false;
    return true;
  }), [rows, search, matFilter, supFilter, statusFilter]);

  /** The approve/reject/update routes return the report WITHOUT populated refs
   * (`plan`/`inspector` come back as raw ObjectId strings), so merge the response
   * over the existing item and keep the populated refs we already have — otherwise
   * the row would fail the `plan.planType` filter and vanish from the list. */
  const applyUpdate = (updated: any) => {
    setReports((prev) => prev.map((it) => (it.id === updated._id
      ? { ...it, ...updated, id: updated._id, plan: it.plan, inspector: it.inspector }
      : it)));
  };

  const approve = async (reportId: string) => {
    setBusy(reportId);
    try {
      const updated = await api.put<any>(`/inspection-reports/${reportId}/approve`, { approvedBy: user?.id, reviewComments: '' });
      applyUpdate(updated);
      toast.success('Material cleared for stores');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const submitComment = async () => {
    if (!pendingAction) return;
    if (comment.trim().length < 10) { toast.error('Min 10 characters required'); return; }
    setBusy(pendingAction.id);
    try {
      let updated: any;
      if (pendingAction.action === 'REJECTED') {
        updated = await api.put<any>(`/inspection-reports/${pendingAction.id}/reject`, { reviewedBy: user?.id, rejectionReason: comment.trim() });
        toast.success('Material quarantined — supplier return triggered');
      } else {
        // No dedicated "info requested" endpoint on the backend — put the report ON_HOLD
        // via the generic update route and record the comment on reviewComments.
        updated = await api.put<any>(`/inspection-reports/${pendingAction.id}`, { status: 'ON_HOLD', reviewComments: comment.trim() });
        toast.success('Information requested from inspector');
      }
      applyUpdate(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setComment(''); setPendingAction(null); setBusy(null);
    }
  };

  const exportRows = filtered.map(({ report, materialName, supplierName, reviewStatus }) => ({
    Plan: report.plan?.planId || report.reportId, Material: materialName, Supplier: supplierName, Status: report.status, Review: reviewStatus,
  }));

  if (reportsLoading || plansLoading || suppliersLoading) {
    return <PageWrapper><LoadingSkeleton /></PageWrapper>;
  }

  return (
    <PageWrapper>
      <PageHeader title="Review Material Inspection Reports" description="Approve, reject or request more info on submitted material reports." action={<ExportButtons data={exportRows} fileName="material-reviews" />} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <Select value={matFilter} onChange={setMatFilter} options={[{ label: 'All Materials', value: 'all' }, ...materialOptions]} className="w-44" />
        <Select value={supFilter} onChange={setSupFilter} options={[{ label: 'All Suppliers', value: 'all' }, ...allSuppliers.map((s: any) => ({ label: s.name, value: s.id }))]} className="w-44" />
        <Select value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[{ label: 'All', value: 'all' }, { label: 'Pending', value: 'PENDING' }, { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' }, { label: 'Info Requested', value: 'INFO_REQUESTED' }]} className="w-44" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12"><EmptyState title="No reports to review" description="All caught up." /></Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(({ report, materialName, supplierName, reviewStatus }) => (
              <motion.div key={report.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <Card className={cn('overflow-hidden', report.checklistResults?.some((cr: any) => cr.result === 'FAIL') && 'border-l-4 border-l-red-500')}>
                  <button onClick={() => setExpanded(expanded === report.id ? null : report.id)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{materialName}</p>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-sm">{supplierName}</span>
                        <ReviewBadge status={reviewStatus} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                        <span>{report.plan?.planId || report.reportId}</span>
                        <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" /> {report.inspector?.name || '—'}</span>
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(report.inspectionDate)}</span>
                      </p>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded === report.id && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {expanded === report.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-4 pt-0 border-t mt-2 space-y-3">
                          <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50"><tr><th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Parameter</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Target</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Actual</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Variance</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Status</th></tr></thead>
                              <tbody>
                                {(report.checklistResults || []).map((cr: any, idx: number) => {
                                  const rag = resultToRAG(cr.result);
                                  return (
                                    <tr key={idx} className="border-t">
                                      <td className="px-3 py-2 font-medium">{cr.parameter}</td>
                                      <td className="px-3 py-2 text-center font-mono">{cr.specificationValue}</td>
                                      <td className="px-3 py-2 text-center font-mono">{cr.actualValue}</td>
                                      <td className="px-3 py-2 text-center font-mono">{cr.variancePercent != null ? `${cr.variancePercent.toFixed(2)}%` : '—'}</td>
                                      <td className="px-3 py-2 text-center">{rag && <RAGBadge status={rag} />}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {report.observations && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observations</p><p className="text-sm">{report.observations}</p></div>}
                          {(report.rejectionReason || report.reviewComments) && <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"><p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Review Comment</p><p className="text-sm">{report.rejectionReason || report.reviewComments}</p></div>}
                          {reviewStatus === 'PENDING' && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                              <Button size="sm" variant="accent" disabled={busy === report.id} onClick={() => approve(report.id)}>{busy === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve</Button>
                              <Button size="sm" variant="destructive" disabled={busy === report.id} onClick={() => setPendingAction({ id: report.id, action: 'REJECTED' })}><XCircle className="h-4 w-4" /> Reject</Button>
                              <Button size="sm" variant="outline" disabled={busy === report.id} onClick={() => setPendingAction({ id: report.id, action: 'INFO_REQUESTED' })}><MessageSquare className="h-4 w-4" /> Request Info</Button>
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
