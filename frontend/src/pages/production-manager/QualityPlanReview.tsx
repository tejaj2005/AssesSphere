import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { cn } from '@/lib/utils';

/** Backend ProductQualityPlan (server/models/ProductQualityPlan.ts). `product` and
 * `qualityManager` come back populated on the list endpoint; the stage-ref sub-docs
 * (`.plan`) are only populated on the single-record GET, and `.stage` is never
 * populated (no `ref` set on that sub-field in the schema), so this page shows the
 * underlying inspection-plan title/status per category rather than named stages. */
interface StageRef {
  stage?: string;
  plan?: string | { _id: string; title?: string; status?: string; planType?: string };
  report?: string;
  inspector?: string;
  status: string;
  notes?: string;
}

interface ProductRef {
  _id: string;
  id?: string;
  name: string;
  productId?: string;
  category?: string;
}

interface QualityPlanDoc {
  _id: string;
  id: string;
  pqpId?: string;
  product: string | ProductRef;
  manufacturingInspections: StageRef[];
  assemblyInspections: StageRef[];
  finalProductInspection?: StageRef;
  materialInspections: StageRef[];
  reviewer?: string;
  reviewDate?: string;
  reviewStatus: 'PENDING' | 'COMPLETED';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  overallStatus: 'GREEN' | 'AMBER' | 'RED' | 'GREY';
  createdAt: string;
}

const entriesOf = (plan: QualityPlanDoc): StageRef[] => [
  ...plan.manufacturingInspections,
  ...plan.assemblyInspections,
  ...plan.materialInspections,
  ...(plan.finalProductInspection ? [plan.finalProductInspection] : []),
];

const planStats = (plan: QualityPlanDoc) => {
  const entries = entriesOf(plan);
  const approved = entries.filter((e) => e.status === 'APPROVED').length;
  const rejected = entries.filter((e) => e.status === 'REJECTED').length;
  const total = entries.length;
  const pending = total - approved - rejected;
  const percent = total ? Math.round((approved / total) * 100) : 0;
  return { entries, approved, rejected, pending, total, percent };
};

const planTitle = (ref?: StageRef['plan']): string => (ref && typeof ref === 'object' ? ref.title || 'Inspection Plan' : 'Inspection Plan');

export const QualityPlanReview = () => {
  const { user } = useAuth();
  const { items: plans, loading, error, update } = useApiResource<QualityPlanDoc>('/quality-plans');
  const { items: products } = useApiResource<{ _id: string; id: string; name: string; productId?: string }>('/admin/products');
  const [detail, setDetail] = useState<QualityPlanDoc | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const productsById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const productOf = (plan: QualityPlanDoc): { name: string; productId?: string } => {
    if (plan.product && typeof plan.product === 'object') return plan.product;
    return productsById[plan.product as string] || { name: 'Unknown Product' };
  };

  const acknowledge = async (plan: QualityPlanDoc) => {
    setBusyId(plan.id);
    try {
      await update(plan.id, { reviewStatus: 'COMPLETED', reviewer: user?.id, reviewDate: new Date().toISOString() } as any);
      setDetail((d) => (d && d.id === plan.id ? { ...d, reviewStatus: 'COMPLETED' } : d));
      toast.success(`Quality plan acknowledged for ${productOf(plan).name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader title="Quality Plan Review" description="Review and acknowledge Quality Manager plans for your products." />

      {error && <Card className="p-4 mb-4 text-sm text-destructive">{error}</Card>}

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const prod = productOf(plan);
          const s = planStats(plan);
          const isAck = plan.reviewStatus === 'COMPLETED';
          return (
            <motion.div key={plan.id} variants={staggerItem}>
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Package className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{prod.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.pqpId || 'PQP'} · {s.total} inspection item{s.total !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {plan.overallStatus !== 'GREY' ? <RAGBadge status={plan.overallStatus} /> : <Badge variant="slate">Not Rated</Badge>}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-500/10"><div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{s.approved}</div><div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Approved</div></div>
                  <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-500/10"><div className="text-lg font-bold text-amber-700 dark:text-amber-400">{s.pending}</div><div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending</div></div>
                  <div className="p-2 rounded-md bg-red-50 dark:bg-red-500/10"><div className="text-lg font-bold text-red-700 dark:text-red-400">{s.rejected}</div><div className="text-[10px] uppercase tracking-wider text-red-700 dark:text-red-400">Rejected</div></div>
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${s.percent}%` }} transition={{ duration: 0.8 }} className={cn('h-full rounded-full', s.percent === 100 ? 'bg-emerald-500' : s.percent > 50 ? 'bg-accent' : 'bg-amber-500')} />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setDetail(plan)}>View Plan</Button>
                  <Button variant={isAck ? 'outline' : 'accent'} size="sm" className="flex-1" disabled={isAck || busyId === plan.id} onClick={() => acknowledge(plan)}>
                    {isAck ? <><CheckCircle2 className="h-4 w-4" /> Acknowledged</> : 'Acknowledge'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
        {!plans.length && (
          <Card className="p-10 text-center text-sm text-muted-foreground lg:col-span-2">No quality plans have been created yet.</Card>
        )}
      </motion.div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[680px]">
        {detail && (() => {
          const prod = productOf(detail);
          const s = planStats(detail);
          const isAck = detail.reviewStatus === 'COMPLETED';
          const sections: { label: string; entries: StageRef[] }[] = [
            { label: 'Manufacturing Inspections', entries: detail.manufacturingInspections },
            { label: 'Assembly Inspections', entries: detail.assemblyInspections },
            { label: 'Material Inspections', entries: detail.materialInspections },
            { label: 'Final Product Inspection', entries: detail.finalProductInspection ? [detail.finalProductInspection] : [] },
          ];
          return (
            <>
              <SheetHeader>
                <SheetTitle>{prod.name}</SheetTitle>
                <SheetDescription>{detail.pqpId || 'Quality Plan'} · {s.total} inspection items</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="space-y-6">
                  {sections.map((sec) => (
                    <section key={sec.label}>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">{sec.label} <Badge variant="outline">{sec.entries.length}</Badge></h4>
                      <div className="space-y-2">
                        {sec.entries.map((e, idx) => (
                          <div key={idx} className="p-3 rounded-lg border flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{planTitle(e.plan)}</p>
                            <Badge variant={e.status === 'APPROVED' ? 'success' : e.status === 'REJECTED' ? 'danger' : 'warning'}>{e.status}</Badge>
                          </div>
                        ))}
                        {!sec.entries.length && <p className="text-xs text-muted-foreground italic">No items</p>}
                      </div>
                    </section>
                  ))}
                </div>
              </SheetBody>
              <SheetFooter>
                <Button variant="accent" disabled={isAck || busyId === detail.id} onClick={() => acknowledge(detail)}>
                  {isAck ? 'Acknowledged' : 'Acknowledge Plan'}
                </Button>
              </SheetFooter>
            </>
          );
        })()}
      </Sheet>
    </PageWrapper>
  );
};
