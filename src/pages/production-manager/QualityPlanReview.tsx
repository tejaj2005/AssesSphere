import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { RAGBadge, ReviewBadge } from '@/components/dashboard/RAGBadge';
import { useData } from '@/context/DataContext';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

export const QualityPlanReview = () => {
  const { products, inspectionPlans, inspectionRecords, manufacturingStages, assemblingStages } = useData();
  const [detail, setDetail] = useState<Product | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const productStats = (p: Product) => {
    const plans = inspectionPlans.filter((pl) => pl.productId === p.id);
    const recs = inspectionRecords.filter((r) => r.productId === p.id);
    const approved = recs.filter((r) => r.reviewStatus === 'APPROVED').length;
    const pending = recs.filter((r) => r.reviewStatus === 'PENDING').length;
    const rejected = recs.filter((r) => r.reviewStatus === 'REJECTED').length;
    const total = recs.length;
    const percent = total ? Math.round((approved / total) * 100) : 0;
    return { plans, recs, approved, pending, rejected, total, percent };
  };

  const acknowledge = (p: Product) => {
    setAcknowledged((s) => new Set(s).add(p.id));
    toast.success(`Quality plan acknowledged for ${p.name}`);
  };

  return (
    <PageWrapper>
      <PageHeader title="Quality Plan Review" description="Review and acknowledge Quality Manager plans for your products." />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {products.map((p) => {
          const s = productStats(p);
          const isAck = acknowledged.has(p.id);
          return (
            <motion.div key={p.id} variants={staggerItem}>
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Package className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{s.plans.length} plan{s.plans.length !== 1 ? 's' : ''} · {s.recs.length} record{s.recs.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <Badge variant={s.percent === 100 ? 'success' : s.percent > 50 ? 'accent' : 'warning'}>{s.percent}% approved</Badge>
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
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setDetail(p)}>View Plan</Button>
                  <Button variant={isAck ? 'outline' : 'accent'} size="sm" className="flex-1" disabled={isAck} onClick={() => acknowledge(p)}>
                    {isAck ? <><CheckCircle2 className="h-4 w-4" /> Acknowledged</> : 'Acknowledge'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[680px]">
        {detail && (() => {
          const s = productStats(detail);
          const mfgStages = manufacturingStages.filter((st) => detail.manufacturingStageIds.includes(st.id));
          const asmStages = assemblingStages.filter((st) => detail.assemblingStageIds.includes(st.id));
          return (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
                <SheetDescription>Quality Plan Breakdown · {s.plans.length} plans · {s.total} inspection records</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="space-y-6">
                  <section>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">Manufacturing Stages <Badge variant="outline">{mfgStages.length}</Badge></h4>
                    <div className="space-y-2">
                      {mfgStages.map((st) => {
                        const stagePlans = s.plans.filter((p) => p.stageId === st.id);
                        const stageRecs = s.recs.filter((r) => r.stageId === st.id);
                        return (
                          <div key={st.id} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between"><p className="font-medium text-sm">{st.order}. {st.name}</p><div className="flex items-center gap-1.5">{stageRecs.slice(0, 3).map((r) => <RAGBadge key={r.id} status={r.status} />)}</div></div>
                            <p className="text-xs text-muted-foreground mt-1">{stagePlans.length} plan(s) · {stageRecs.length} record(s)</p>
                          </div>
                        );
                      })}
                      {mfgStages.length === 0 && <p className="text-xs text-muted-foreground italic">No manufacturing stages</p>}
                    </div>
                  </section>

                  <section>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">Assembling Stages <Badge variant="outline">{asmStages.length}</Badge></h4>
                    <div className="space-y-2">
                      {asmStages.map((st) => {
                        const stagePlans = s.plans.filter((p) => p.stageId === st.id);
                        const stageRecs = s.recs.filter((r) => r.stageId === st.id);
                        return (
                          <div key={st.id} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between"><p className="font-medium text-sm">{st.order}. {st.name}</p><div className="flex items-center gap-1.5">{stageRecs.slice(0, 3).map((r) => <RAGBadge key={r.id} status={r.status} />)}</div></div>
                            <p className="text-xs text-muted-foreground mt-1">{stagePlans.length} plan(s) · {stageRecs.length} record(s)</p>
                          </div>
                        );
                      })}
                      {asmStages.length === 0 && <p className="text-xs text-muted-foreground italic">No assembling stages</p>}
                    </div>
                  </section>

                  <section>
                    <h4 className="font-semibold text-sm mb-2">Final Product Inspection</h4>
                    <div className="p-3 rounded-lg border">
                      <p className="text-sm">{s.recs.filter((r) => r.type === 'FINAL_PRODUCT').length} final-product inspection(s) recorded</p>
                    </div>
                  </section>
                </div>
              </SheetBody>
              <SheetFooter>
                <Button variant="accent" disabled={acknowledged.has(detail.id)} onClick={() => { acknowledge(detail); setDetail(null); }}>
                  {acknowledged.has(detail.id) ? 'Acknowledged' : 'Acknowledge Plan'}
                </Button>
              </SheetFooter>
            </>
          );
        })()}
      </Sheet>
    </PageWrapper>
  );
};
