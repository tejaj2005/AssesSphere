import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare, ChevronDown, Loader2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { RAGBadge, ReviewBadge } from '@/components/dashboard/RAGBadge';
import { AIQualityScoreBadge } from '@/components/ai/AIQualityScoreBadge';
import { useApiResource } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import type { RAGStatus, ReviewStatus } from '@/types';

type Tab = 'MFG' | 'ASM' | 'FP' | 'SUPPLIER' | 'MATERIAL';

/** Backend InspectionReport.status (and the free-text status on a quality plan's
 * material-inspection line items) → the simpler review vocabulary this page's shared
 * badges/filters were built around. SUBMITTED/UNDER_REVIEW both read as PENDING;
 * ON_HOLD is the closest match for "more information requested". */
const toReviewStatus = (status: string): ReviewStatus => {
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'ON_HOLD') return 'INFO_REQUESTED';
  return 'PENDING';
};

const resultToRag = (result: string): RAGStatus => (result === 'FAIL' ? 'RED' : result === 'MARGINAL' ? 'AMBER' : 'GREEN');
const scoreToRag = (score: number): RAGStatus => (score >= 7 ? 'GREEN' : score >= 4 ? 'AMBER' : 'RED');

/** Resolve a possibly-populated ref (an object with `.name`) or a raw ObjectId string back
 * to a display name. Needed because several approve/reject/PUT endpoints return the document
 * without re-populating every ref, so right after an action the field is just an id string. */
const nameOf = (ref: any, currentUserId?: string, currentUserName?: string, fallback = 'Unknown'): string => {
  if (!ref) return fallback;
  if (typeof ref === 'object') return ref.name || fallback;
  if (currentUserId && ref === currentUserId) return currentUserName || 'You';
  return fallback;
};

export const ReviewAllReports = () => {
  const { user } = useAuth();
  const orgQuery = useMemo(() => ({ organization: user?.organization || '' }), [user?.organization]);

  const { items: reports, setItems: setReports, loading: reportsLoading } = useApiResource<any>('/inspection-reports', { ...orgQuery, limit: '500' }, 20000);
  const { items: supplierEvaluations, setItems: setSupplierEvals, loading: evalsLoading } = useApiResource<any>('/supplier-evaluations', orgQuery, 20000);
  const { items: qualityPlans, setItems: setQualityPlans, loading: plansLoading } = useApiResource<any>('/quality-plans', orgQuery, 20000);
  const { items: materials } = useApiResource<any>('/admin/materials', orgQuery);

  const materialsById = useMemo(() => Object.fromEntries(materials.map((m: any) => [m.id, m.name])), [materials]);

  const [tab, setTab] = useState<Tab>('MFG');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('PENDING');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ kind: 'report' | 'material'; id: string; action: 'REJECTED' | 'INFO_REQUESTED'; meta?: { plan: any; idx: number } } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const matches = (text: string) => !search || text.toLowerCase().includes(search.toLowerCase());

  /** PUT /inspection-reports/:id (and its /approve, /reject, /hold sub-routes) return the
   * report without re-populating `plan`/`inspector` — merge the response over the existing
   * row and keep those two populated refs, otherwise the plan-type tab filters would break. */
  const applyReportUpdate = (updated: any) =>
    setReports((prev) => prev.map((it: any) => (it.id === updated._id ? { ...it, ...updated, id: updated._id, plan: it.plan, inspector: it.inspector } : it)));

  const filterReports = (planType: string) => reports.filter((r: any) => {
    if (r.status === 'DRAFT' || r.plan?.planType !== planType) return false;
    const text = `${r.plan?.title || ''} ${r.plan?.planId || ''} ${r.inspector?.name || ''} ${(r.checklistResults || []).map((c: any) => c.parameter).join(' ')}`;
    if (!matches(text)) return false;
    if (statusFilter !== 'all' && toReviewStatus(r.status) !== statusFilter) return false;
    return true;
  });

  const mfgReports = useMemo(() => filterReports('R3_MANUFACTURING'), [reports, search, statusFilter]);
  const asmReports = useMemo(() => filterReports('R4_ASSEMBLY'), [reports, search, statusFilter]);
  const fpReports = useMemo(() => filterReports('R5_FINAL'), [reports, search, statusFilter]);
  const fpPendingCount = fpReports.filter((r: any) => toReviewStatus(r.status) === 'PENDING').length;

  // ── Supplier evaluations tab ──
  const supplierEvalsFiltered = useMemo(() => supplierEvaluations.filter((e: any) => {
    const text = `${e.supplier?.name || ''} ${e.period || ''}`;
    if (!matches(text)) return false;
    if (statusFilter !== 'all' && toReviewStatus(e.reviewStatus) !== statusFilter) return false;
    return true;
  }), [supplierEvaluations, search, statusFilter]);

  const approveEval = async (e: any) => {
    setBusy(e.id);
    try {
      const updated = await api.put<any>(`/supplier-evaluations/${e.id}/approve`, { reviewedBy: user?.id });
      setSupplierEvals((prev) => prev.map((it: any) => (it.id === updated._id ? { ...it, ...updated, id: updated._id, evaluatedBy: it.evaluatedBy } : it)));
      toast.success('Evaluation approved — supplier ratings recalculated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  // ── Material / quality-plan tab: review each plan's materialInspections line items ──
  const materialRows = useMemo(() => {
    const rows: { plan: any; idx: number; entry: any; materialName: string; status: string }[] = [];
    qualityPlans.forEach((p: any) => {
      (p.materialInspections || []).forEach((entry: any, idx: number) => {
        const matId = typeof entry.material === 'object' ? entry.material?._id : entry.material;
        const materialName = (typeof entry.material === 'object' ? entry.material?.name : undefined) || materialsById[matId] || 'Unspecified Material';
        rows.push({ plan: p, idx, entry, materialName, status: entry.status || 'PENDING' });
      });
    });
    return rows;
  }, [qualityPlans, materialsById]);

  const materialRowsFiltered = useMemo(() => materialRows.filter(({ plan, materialName, status }) => {
    const text = `${materialName} ${plan.product?.name || ''} ${plan.pqpId || ''}`;
    if (!matches(text)) return false;
    if (statusFilter !== 'all' && toReviewStatus(status) !== statusFilter) return false;
    return true;
  }), [materialRows, search, statusFilter]);

  const materialGroups = useMemo(() => {
    const map = new Map<string, { plan: any; rows: typeof materialRowsFiltered }>();
    materialRowsFiltered.forEach((row) => {
      if (!map.has(row.plan.id)) map.set(row.plan.id, { plan: row.plan, rows: [] });
      map.get(row.plan.id)!.rows.push(row);
    });
    return Array.from(map.values());
  }, [materialRowsFiltered]);

  const updateMaterialEntry = async (plan: any, idx: number, status: string, notes?: string) => {
    const key = `${plan.id}-${idx}`;
    setBusy(key);
    try {
      // Targeted per-entry update (not a full-array PUT built from a possibly-stale local
      // snapshot) — see server/routes/product-quality-plan.routes.ts for why: two entries on
      // the same plan being actioned close together must not be able to revert each other.
      const updated = await api.put<any>(`/quality-plans/${plan.id}/material-inspections/${idx}`, { status, ...(notes !== undefined ? { notes } : {}) });
      setQualityPlans((prev) => prev.map((p: any) => (p.id === plan.id ? { ...p, ...updated, id: updated._id, product: p.product, qualityManager: p.qualityManager } : p)));
      toast.success(status === 'APPROVED' ? 'Material inspection approved' : status === 'REJECTED' ? 'Material inspection rejected' : 'Information requested');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const completePlan = async (plan: any) => {
    setBusy(plan.id);
    try {
      const updated = await api.put<any>(`/quality-plans/${plan.id}/complete`, {});
      setQualityPlans((prev) => prev.map((p: any) => (p.id === plan.id ? { ...p, ...updated, id: updated._id, product: p.product, qualityManager: p.qualityManager } : p)));
      toast.success('Quality plan marked complete');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  // ── Two-tier InspectionReport review: L1 (soft, forwards for final approval) then QM final ──
  const l1Approve = async (r: any) => {
    setBusy(r.id);
    try {
      const updated = await api.put<any>(`/inspection-reports/${r.id}`, {
        l1ReviewedBy: user?.id, l1ReviewedAt: new Date().toISOString(), l1Comments: 'Reviewed — forwarded for final QM approval', status: 'UNDER_REVIEW',
      });
      applyReportUpdate(updated);
      toast.success('L1 review complete — forwarded for final approval');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const qmApprove = async (r: any) => {
    setBusy(r.id);
    try {
      const updated = await api.put<any>(`/inspection-reports/${r.id}/approve`, { approvedBy: user?.id, reviewComments: '' });
      applyReportUpdate(updated);
      toast.success('Report approved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const submitComment = async () => {
    if (!pendingAction) return;
    if (comment.trim().length < 10) { toast.error('Comment must be ≥ 10 chars'); return; }
    const c = comment.trim();
    if (pendingAction.kind === 'report') {
      setBusy(pendingAction.id);
      try {
        const updated = pendingAction.action === 'REJECTED'
          ? await api.put<any>(`/inspection-reports/${pendingAction.id}/reject`, { reviewedBy: user?.id, rejectionReason: c })
          : await api.put<any>(`/inspection-reports/${pendingAction.id}/hold`, {});
        applyReportUpdate(updated);
        toast.success(pendingAction.action === 'REJECTED' ? 'Rejected — returned to inspector' : 'Information requested');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setBusy(null);
      }
    } else if (pendingAction.meta) {
      await updateMaterialEntry(pendingAction.meta.plan, pendingAction.meta.idx, pendingAction.action === 'REJECTED' ? 'REJECTED' : 'ON_HOLD', c);
    }
    setComment(''); setPendingAction(null);
  };

  const renderReportCard = (r: any) => {
    const reviewStatus = toReviewStatus(r.status);
    const pendingL1 = reviewStatus === 'PENDING' && !r.l1ReviewedBy;
    const pendingQm = reviewStatus === 'PENDING' && !!r.l1ReviewedBy;
    const checklist = r.checklistResults || [];
    return (
      <motion.div key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card className={cn('overflow-hidden', r.overallResult === 'FAIL' && 'border-l-4 border-l-red-500')}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(expanded === r.id ? null : r.id); } }}
            className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-medium">{r.reportId}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="font-semibold">{r.plan?.title || 'Untitled Plan'}</span>
                <ReviewBadge status={reviewStatus} />
                {pendingQm && <Badge variant="accent">Pending Final Approval</Badge>}
                {checklist.length > 0 && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <AIQualityScoreBadge assessmentData={{
                      assessmentId: r.id,
                      totalQuestions: checklist.length,
                      answeredQuestions: checklist.filter((c: any) => c.actualValue != null && c.actualValue !== '').length,
                      evidenceCount: checklist.filter((c: any) => !!c.observations).length,
                      findingsCount: checklist.filter((c: any) => c.result === 'FAIL' || c.result === 'MARGINAL').length,
                      capaCount: 0,
                      checklistCompletionRate: Math.round((checklist.filter((c: any) => c.actualValue != null && c.actualValue !== '').length / checklist.length) * 100),
                    }} />
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {nameOf(r.inspector, user?.id, user?.name, 'Unknown Inspector')} · {formatDate(r.inspectionDate)} {r.l1ReviewedBy && '· L1 reviewed'}
              </p>
            </div>
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded === r.id && 'rotate-180')} />
          </div>
          <AnimatePresence>
            {expanded === r.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="p-4 pt-0 border-t mt-2 space-y-3">
                  {(r.checklistResults || []).length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50"><tr><th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Parameter</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Target</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Actual</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Variance</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Result</th></tr></thead>
                        <tbody>
                          {r.checklistResults.map((c: any, i: number) => (
                            <tr key={i} className="border-t">
                              <td className="px-3 py-2 font-medium">{c.parameter}</td>
                              <td className="px-3 py-2 text-center font-mono">{c.specificationValue}</td>
                              <td className="px-3 py-2 text-center font-mono">{c.actualValue}</td>
                              <td className="px-3 py-2 text-center font-mono">{c.variancePercent != null ? `${c.variancePercent.toFixed(2)}%` : '—'}</td>
                              <td className="px-3 py-2 text-center"><RAGBadge status={resultToRag(c.result)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {r.observations && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observations</p><p className="text-sm">{r.observations}</p></div>}
                  {r.l1Comments && <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"><p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">L1 Review</p><p className="text-sm">{r.l1Comments}</p></div>}
                  {(r.rejectionReason || r.reviewComments) && <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"><p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Review Comment</p><p className="text-sm">{r.rejectionReason || r.reviewComments}</p></div>}
                  {pendingL1 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button size="sm" variant="accent" disabled={busy === r.id} onClick={() => l1Approve(r)}>{busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} L1 Approve</Button>
                      <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => setPendingAction({ kind: 'report', id: r.id, action: 'REJECTED' })}><XCircle className="h-4 w-4" /> Reject</Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => setPendingAction({ kind: 'report', id: r.id, action: 'INFO_REQUESTED' })}><MessageSquare className="h-4 w-4" /> Request Info</Button>
                    </div>
                  )}
                  {pendingQm && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button size="sm" variant="accent" disabled={busy === r.id} onClick={() => qmApprove(r)}>{busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Final Approve</Button>
                      <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => setPendingAction({ kind: 'report', id: r.id, action: 'REJECTED' })}><XCircle className="h-4 w-4" /> Reject</Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => setPendingAction({ kind: 'report', id: r.id, action: 'INFO_REQUESTED' })}><MessageSquare className="h-4 w-4" /> Request Info</Button>
                    </div>
                  )}
                  {!pendingL1 && !pendingQm && (r.approvedBy || r.reviewedBy) && (
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      {reviewStatus === 'APPROVED' ? 'Approved' : 'Reviewed'} by <span className="font-medium">{nameOf(r.approvedBy || r.reviewedBy, user?.id, user?.name, 'QM')}</span>
                      {(r.approvedAt || r.reviewedAt) && <> on {formatDate(r.approvedAt || r.reviewedAt)}</>}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  };

  const exportRows = reports.map((r: any) => ({ Report: r.reportId, Plan: r.plan?.title, Type: r.plan?.planType, Inspector: r.inspector?.name, Status: r.status }));

  const initialLoading = (reportsLoading && !reports.length) || (evalsLoading && !supplierEvaluations.length) || (plansLoading && !qualityPlans.length);
  if (initialLoading) {
    return <PageWrapper><LoadingSkeleton /></PageWrapper>;
  }

  return (
    <PageWrapper>
      <PageHeader title="Review All Reports" description="Final approval gate for all inspection reports." action={<ExportButtons data={exportRows} fileName="qm-reviews" />} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="MFG">Manufacturing ({mfgReports.length})</TabsTrigger>
          <TabsTrigger value="ASM">Assembling ({asmReports.length})</TabsTrigger>
          <TabsTrigger value="FP" className="relative">Final Product ({fpReports.length}){fpPendingCount > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />}</TabsTrigger>
          <TabsTrigger value="SUPPLIER">Supplier Eval ({supplierEvalsFiltered.length})</TabsTrigger>
          <TabsTrigger value="MATERIAL">Material ({materialRowsFiltered.length})</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-3 my-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as any)}
            options={[{ label: 'All', value: 'all' }, { label: 'Pending', value: 'PENDING' }, { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' }, { label: 'Info Requested', value: 'INFO_REQUESTED' }]}
            className="w-44"
          />
        </div>

        <TabsContent value="MFG"><div className="space-y-3">{mfgReports.length === 0 ? <Card className="p-12"><EmptyState title="No reports" /></Card> : mfgReports.map(renderReportCard)}</div></TabsContent>
        <TabsContent value="ASM"><div className="space-y-3">{asmReports.length === 0 ? <Card className="p-12"><EmptyState title="No reports" /></Card> : asmReports.map(renderReportCard)}</div></TabsContent>
        <TabsContent value="FP"><div className="space-y-3">{fpReports.length === 0 ? <Card className="p-12"><EmptyState title="No final product reports" /></Card> : fpReports.map(renderReportCard)}</div></TabsContent>

        <TabsContent value="SUPPLIER">
          <div className="space-y-3">
            {supplierEvalsFiltered.length === 0 ? <Card className="p-12"><EmptyState title="No supplier evaluations" /></Card> :
              supplierEvalsFiltered.map((e: any) => (
                <Card key={e.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{e.supplier?.name || 'Unknown Supplier'}</p>
                      <p className="text-xs text-muted-foreground">By {nameOf(e.evaluatedBy, user?.id, user?.name, 'Unknown')} on {formatDate(e.evaluationDate)} · {e.period}</p>
                    </div>
                    <ReviewBadge status={toReviewStatus(e.reviewStatus)} />
                  </div>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <RAGBadge status={scoreToRag(e.qualityScore)} label={`Quality ${e.qualityScore}`} />
                    <RAGBadge status={scoreToRag(e.deliveryScore)} label={`Delivery ${e.deliveryScore}`} />
                    <RAGBadge status={scoreToRag(e.quantityScore)} label={`Quantity ${e.quantityScore}`} />
                    <RAGBadge status={scoreToRag(e.communicationScore)} label={`Comm ${e.communicationScore}`} />
                    <RAGBadge status={scoreToRag(e.overallScore)} label={`Overall ${e.overallScore}`} />
                  </div>
                  {e.remarks && <p className="text-sm text-muted-foreground mb-2">{e.remarks}</p>}
                  {e.reviewStatus === 'PENDING' && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="accent" disabled={busy === e.id} onClick={() => approveEval(e)}>
                        {busy === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve
                      </Button>
                      {/* No dedicated reject endpoint exists for supplier evaluations on the
                          backend (only GET/POST/PUT :id/approve) — rejection isn't wired here. */}
                    </div>
                  )}
                </Card>
              ))
            }
          </div>
        </TabsContent>

        <TabsContent value="MATERIAL">
          <div className="space-y-3">
            {materialGroups.length === 0 ? <Card className="p-12"><EmptyState title="No material inspections" description="No material inspection line items match the current filter." /></Card> :
              materialGroups.map(({ plan, rows }) => (
                <Card key={plan.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{plan.product?.name || 'Unknown Product'}</p>
                      <p className="text-xs text-muted-foreground">{plan.pqpId}</p>
                    </div>
                    <Button size="sm" variant="outline" disabled={plan.status === 'COMPLETED' || busy === plan.id} onClick={() => completePlan(plan)}>
                      {busy === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} {plan.status === 'COMPLETED' ? 'Completed' : 'Mark Plan Complete'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {rows.map(({ entry, idx, materialName, status }) => {
                      const key = `${plan.id}-${idx}`;
                      const rv = toReviewStatus(status);
                      return (
                        <div key={key} className="flex items-center justify-between p-3 rounded-lg border gap-2 flex-wrap">
                          <div className="min-w-0"><p className="text-sm font-medium">{materialName}</p>{entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}</div>
                          <div className="flex items-center gap-2">
                            <ReviewBadge status={rv} />
                            {rv === 'PENDING' && (
                              <>
                                <Button size="sm" variant="accent" disabled={busy === key} onClick={() => updateMaterialEntry(plan, idx, 'APPROVED')}>{busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}</Button>
                                <Button size="sm" variant="destructive" disabled={busy === key} onClick={() => setPendingAction({ kind: 'material', id: key, action: 'REJECTED', meta: { plan, idx } })}><XCircle className="h-4 w-4" /></Button>
                                <Button size="sm" variant="outline" disabled={busy === key} onClick={() => setPendingAction({ kind: 'material', id: key, action: 'INFO_REQUESTED', meta: { plan, idx } })}><MessageSquare className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))
            }
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!pendingAction} onOpenChange={(o) => !o && (setPendingAction(null), setComment(''))}>
        <DialogHeader><DialogTitle>{pendingAction?.action === 'REJECTED' ? 'Reject' : 'Request Information'}</DialogTitle><DialogDescription>Min 10 chars.</DialogDescription></DialogHeader>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} autoFocus />
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setPendingAction(null); setComment(''); }}>Cancel</Button>
          <Button variant={pendingAction?.action === 'REJECTED' ? 'destructive' : 'accent'} onClick={submitComment} disabled={comment.trim().length < 10}>Submit</Button>
        </DialogFooter>
      </Dialog>
    </PageWrapper>
  );
};
