import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
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
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import type { InspectionReport, InspectorReportType } from '@/types';

type Tab = 'MFG' | 'ASM' | 'FP' | 'SUPPLIER' | 'MATERIAL';

export const ReviewAllReports = () => {
  const { inspectionReports, materialPlans, supplierEvaluations, products, qualityPlans, reviewInspectionReport, reviewMaterialPlan, updateSupplierEvaluation, updateQualityPlan } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('MFG');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; type: 'report' | 'material' | 'eval'; action: 'REJECTED' | 'INFO_REQUESTED' } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const reportsByType: Record<Tab, InspectionReport[]> = {
    MFG: inspectionReports.filter((r) => r.type === 'COMPONENT' && r.stageName),
    ASM: inspectionReports.filter((r) => r.type === 'ASSEMBLY'),
    FP: inspectionReports.filter((r) => r.type === 'FINAL_PRODUCT'),
    SUPPLIER: [], MATERIAL: [],
  };

  const applyFilters = <T extends { productName?: string; reportStatus?: string }>(arr: T[]) =>
    arr.filter((r) => {
      if (search && !(JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))) return false;
      if (productFilter !== 'all' && r.productName !== products.find((p) => p.id === productFilter)?.name) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'PENDING' && r.reportStatus !== 'SUBMITTED' && r.reportStatus !== 'L1_APPROVED') return false;
        if (statusFilter === 'APPROVED' && r.reportStatus !== 'FINAL_APPROVED') return false;
        if (statusFilter === 'REJECTED' && r.reportStatus !== 'REJECTED') return false;
      }
      return true;
    });

  const approveReport = async (r: InspectionReport) => {
    setBusy(r.id);
    await new Promise((res) => setTimeout(res, 250));
    reviewInspectionReport(r.id, 'QM', 'APPROVED', '', user?.name || 'QM');
    // Cascade: if final product, mark quality plan completed
    if (r.type === 'FINAL_PRODUCT' && r.productId) {
      const qp = qualityPlans.find((p) => p.productId === r.productId);
      if (qp) {
        const allOk = [...qp.manufacturingStages, ...qp.assemblingStages].every((s) => s.reportStatus === 'APPROVED');
        if (allOk) {
          updateQualityPlan(qp.id, { status: 'COMPLETED', completionPercentage: 100 });
          toast.success(`🎉 ${qp.productName} Quality Plan COMPLETED. Product cleared for shipment!`);
          setBusy(null);
          return;
        }
      }
    }
    toast.success('Report approved');
    setBusy(null);
  };

  const submitComment = async () => {
    if (!pendingAction) return;
    if (comment.trim().length < 10) { toast.error('Comment must be ≥ 10 chars'); return; }
    setBusy(pendingAction.id);
    await new Promise((r) => setTimeout(r, 250));
    if (pendingAction.type === 'report') reviewInspectionReport(pendingAction.id, 'QM', pendingAction.action, comment.trim(), user?.name || 'QM');
    else if (pendingAction.type === 'material') reviewMaterialPlan(pendingAction.id, pendingAction.action, comment.trim(), user?.name || 'QM');
    else updateSupplierEvaluation(pendingAction.id, { approvalStatus: pendingAction.action === 'REJECTED' ? 'REJECTED' : 'PENDING', comments: comment.trim() });
    toast.success(pendingAction.action === 'REJECTED' ? 'Rejected — returned to inspector' : 'Information requested');
    setBusy(null); setComment(''); setPendingAction(null);
  };

  const renderReportCard = (r: InspectionReport) => (
    <motion.div key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className={cn('overflow-hidden', r.parameters.some((p) => p.status === 'RED') && 'border-l-4 border-l-red-500')}>
        <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-medium">{r.reportCode}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="font-semibold">{r.productName}</span>
              <span className="text-xs">{r.stageName || r.materialName || r.componentName}</span>
              <ReviewBadge status={r.reportStatus === 'SUBMITTED' || r.reportStatus === 'L1_APPROVED' ? 'PENDING' : r.reportStatus === 'FINAL_APPROVED' ? 'APPROVED' : r.reportStatus === 'REJECTED' ? 'REJECTED' : 'PENDING'} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{r.inspectorName} · {formatDate(r.inspectionDate)} {r.l1ReviewerName && `· L1 by ${r.l1ReviewerName}`}</p>
          </div>
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded === r.id && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {expanded === r.id && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-4 pt-0 border-t mt-2 space-y-3">
                {r.parameters.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50"><tr><th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Parameter</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Target</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Actual</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Variance</th><th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center">Status</th></tr></thead>
                      <tbody>{r.parameters.map((p) => (<tr key={p.id} className="border-t"><td className="px-3 py-2 font-medium">{p.parameterName}</td><td className="px-3 py-2 text-center font-mono">{p.targetValue} {p.unit}</td><td className="px-3 py-2 text-center font-mono">{p.actualValue.toFixed(2)} {p.unit}</td><td className="px-3 py-2 text-center font-mono">{p.variance.toFixed(2)}%</td><td className="px-3 py-2 text-center"><RAGBadge status={p.status} /></td></tr>))}</tbody>
                    </table>
                  </div>
                )}
                {r.checklistItems && r.checklistItems.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Checklist</p>
                    <ul className="space-y-1">
                      {r.checklistItems.map((it) => (
                        <li key={it.id} className="flex items-center gap-2 text-xs"><Badge variant={it.result === 'PASS' ? 'success' : it.result === 'FAIL' ? 'danger' : it.result === 'NOTE' ? 'accent' : 'slate'}>{it.result}</Badge>{it.item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.observations && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observations</p><p className="text-sm">{r.observations}</p></div>}
                {r.l1Comment && <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"><p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">L1 Review</p><p className="text-sm">{r.l1Comment}</p></div>}
                {(r.reportStatus === 'SUBMITTED' || r.reportStatus === 'L1_APPROVED') && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="accent" disabled={busy === r.id} onClick={() => approveReport(r)}>{busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve</Button>
                    <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => setPendingAction({ id: r.id, type: 'report', action: 'REJECTED' })}><XCircle className="h-4 w-4" /> Reject</Button>
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => setPendingAction({ id: r.id, type: 'report', action: 'INFO_REQUESTED' })}><MessageSquare className="h-4 w-4" /> Request Info</Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );

  const supplierEvalsFiltered = supplierEvaluations.filter((e) => statusFilter === 'all' || (statusFilter === 'PENDING' ? e.approvalStatus === 'PENDING' : e.approvalStatus === statusFilter));
  const materialPlansFiltered = materialPlans.filter((p) => statusFilter === 'all' || (statusFilter === 'PENDING' ? p.reviewStatus === 'PENDING' : statusFilter === 'APPROVED' ? p.reviewStatus === 'APPROVED' : p.reviewStatus === 'REJECTED'));

  const fpPendingDot = applyFilters(reportsByType.FP).filter((r) => r.reportStatus === 'SUBMITTED' || r.reportStatus === 'L1_APPROVED').length;
  const exportRows = inspectionReports.map((r) => ({ Report: r.reportCode, Product: r.productName, Type: r.type, Inspector: r.inspectorName, Status: r.reportStatus }));

  return (
    <PageWrapper>
      <PageHeader title="Review All Reports" description="Final approval gate for all inspection reports." action={<ExportButtons data={exportRows} fileName="qm-reviews" />} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="MFG">Manufacturing ({applyFilters(reportsByType.MFG).length})</TabsTrigger>
          <TabsTrigger value="ASM">Assembling ({applyFilters(reportsByType.ASM).length})</TabsTrigger>
          <TabsTrigger value="FP" className="relative">Final Product ({applyFilters(reportsByType.FP).length}){fpPendingDot > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />}</TabsTrigger>
          <TabsTrigger value="SUPPLIER">Supplier Eval ({supplierEvalsFiltered.length})</TabsTrigger>
          <TabsTrigger value="MATERIAL">Material ({materialPlansFiltered.length})</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-3 my-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
          <Select value={productFilter} onChange={setProductFilter} options={[{ label: 'All Products', value: 'all' }, ...products.map((p) => ({ label: p.name, value: p.id }))]} className="w-48" />
          <Select value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[{ label: 'All', value: 'all' }, { label: 'Pending', value: 'PENDING' }, { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' }]} className="w-40" />
        </div>

        <TabsContent value="MFG"><div className="space-y-3">{applyFilters(reportsByType.MFG).length === 0 ? <Card className="p-12"><EmptyState title="No reports" /></Card> : applyFilters(reportsByType.MFG).map(renderReportCard)}</div></TabsContent>
        <TabsContent value="ASM"><div className="space-y-3">{applyFilters(reportsByType.ASM).length === 0 ? <Card className="p-12"><EmptyState title="No reports" /></Card> : applyFilters(reportsByType.ASM).map(renderReportCard)}</div></TabsContent>
        <TabsContent value="FP"><div className="space-y-3">{applyFilters(reportsByType.FP).length === 0 ? <Card className="p-12"><EmptyState title="No final product reports" /></Card> : applyFilters(reportsByType.FP).map(renderReportCard)}</div></TabsContent>

        <TabsContent value="SUPPLIER">
          <div className="space-y-3">
            {supplierEvalsFiltered.length === 0 ? <Card className="p-12"><EmptyState title="No supplier evaluations" /></Card> :
              supplierEvalsFiltered.map((e) => (
                <Card key={e.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div><p className="font-semibold">{e.supplierName}</p><p className="text-xs text-muted-foreground">By {e.evaluatedBy} on {formatDate(e.evaluationDate)}</p></div>
                    <Badge variant={e.approvalStatus === 'APPROVED' ? 'success' : e.approvalStatus === 'REJECTED' ? 'danger' : 'warning'}>{e.approvalStatus}</Badge>
                  </div>
                  <div className="flex gap-2 mb-3"><RAGBadge status={e.qualityStatus} label={`Q ${e.qualityRating}`} /><RAGBadge status={e.deliveryStatus} label={`D ${e.deliveryRating}`} /><RAGBadge status={e.quantityStatus} label={`Qty ${e.quantityRating}`} /><RAGBadge status={e.overallStatus} label="Overall" /></div>
                  {e.approvalStatus === 'PENDING' && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="accent" onClick={() => { updateSupplierEvaluation(e.id, { approvalStatus: 'APPROVED', approvedBy: user?.name }); toast.success('Evaluation approved'); }}><CheckCircle className="h-4 w-4" /> Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => setPendingAction({ id: e.id, type: 'eval', action: 'REJECTED' })}><XCircle className="h-4 w-4" /> Reject</Button>
                    </div>
                  )}
                </Card>
              ))
            }
          </div>
        </TabsContent>

        <TabsContent value="MATERIAL">
          <div className="space-y-3">
            {materialPlansFiltered.length === 0 ? <Card className="p-12"><EmptyState title="No material reports" /></Card> :
              materialPlansFiltered.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div><p className="font-semibold">{p.materialName}</p><p className="text-xs text-muted-foreground">{p.supplierName} · {p.quantity} {p.unit} · {p.planCode}</p></div>
                    <ReviewBadge status={p.reviewStatus} />
                  </div>
                  {p.reviewStatus === 'PENDING' && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="accent" onClick={() => { reviewMaterialPlan(p.id, 'APPROVED', '', user?.name || 'QM'); toast.success('Approved'); }}><CheckCircle className="h-4 w-4" /> Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => setPendingAction({ id: p.id, type: 'material', action: 'REJECTED' })}><XCircle className="h-4 w-4" /> Reject</Button>
                    </div>
                  )}
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
