import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Circle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { formatDate, cn } from '@/lib/utils';

/** Backend ProductQualityPlan (server/models/ProductQualityPlan.ts). Stage entries only carry
 * `stage`/`plan`/`report`/`inspector`/`status`/`notes` — there is no checklist or equipment
 * concept on the backend stage sub-schema (checklists only live inline on an InspectionPlan's
 * own `checklistTemplate`), so those selectors from the old mock-data form are dropped here. */
interface StageDoc { _id: string; name: string; sequence?: number }

interface ProductDoc {
  _id: string;
  id: string;
  name: string;
  productId?: string;
  manufacturingStages: StageDoc[];
  assemblyStages: StageDoc[];
}

interface UserDoc { _id: string; id: string; name: string; role: string }

interface StageRef {
  stage?: string;
  plan?: string;
  report?: string;
  inspector?: string;
  status: string;
  notes?: string;
}

interface QualityPlanDoc {
  _id: string;
  id: string;
  pqpId?: string;
  product: string | { _id: string; id?: string; name: string; productId?: string };
  manufacturingInspections: StageRef[];
  assemblyInspections: StageRef[];
  finalProductInspection?: StageRef;
  materialInspections: StageRef[];
  reviewStatus: 'PENDING' | 'COMPLETED';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  overallStatus: 'GREEN' | 'AMBER' | 'RED' | 'GREY';
  createdAt: string;
}

const StageIndicator = ({ status }: { status: string }) => {
  if (status === 'APPROVED') return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  if (status === 'REJECTED') return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};

const entriesOf = (plan: QualityPlanDoc): StageRef[] => [
  ...plan.manufacturingInspections,
  ...plan.assemblyInspections,
  ...(plan.finalProductInspection ? [plan.finalProductInspection] : []),
];

const completionOf = (plan: QualityPlanDoc): number => {
  const entries = entriesOf(plan);
  if (!entries.length) return 0;
  return Math.round((entries.filter((e) => e.status === 'APPROVED').length / entries.length) * 100);
};

const emptyRow = { requirements: '', inspectorId: '' };

export const ProductQualityPlans = () => {
  const { user } = useAuth();
  const { items: plans, loading, error, create } = useApiResource<QualityPlanDoc>('/quality-plans');
  const { items: products } = useApiResource<ProductDoc>('/admin/products');
  const { items: inspectors } = useApiResource<UserDoc>('/admin/users', { role: 'Inspector' });

  const [tab, setTab] = useState<'all' | 'DRAFT' | 'ACTIVE' | 'COMPLETED'>('all');
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState<QualityPlanDoc | null>(null);
  const [productId, setProductId] = useState('');
  const [busy, setBusy] = useState(false);
  const [mfgReqs, setMfgReqs] = useState<Record<string, { requirements: string; inspectorId: string }>>({});
  const [asmReqs, setAsmReqs] = useState<Record<string, { requirements: string; inspectorId: string }>>({});
  const [fpReq, setFpReq] = useState({ requirements: '', inspectorId: '' });

  const productsById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const inspectorsById = useMemo(() => Object.fromEntries(inspectors.map((u) => [u.id, u.name])), [inspectors]);

  const productIdOf = (plan: QualityPlanDoc): string => (typeof plan.product === 'string' ? plan.product : plan.product._id);
  const productOf = (plan: QualityPlanDoc): ProductDoc => {
    const id = productIdOf(plan);
    return productsById[id] || { _id: id, id, name: typeof plan.product === 'object' ? plan.product.name : 'Unknown Product', manufacturingStages: [], assemblyStages: [] };
  };
  const stageName = (product: ProductDoc, category: 'mfg' | 'asm', stageId?: string) => {
    if (!stageId) return undefined;
    const list = category === 'mfg' ? product.manufacturingStages : product.assemblyStages;
    return list.find((s) => s._id === stageId)?.name;
  };

  const filtered = useMemo(() => plans.filter((p) => tab === 'all' || p.status === tab), [plans, tab]);
  const count = (s: string) => plans.filter((p) => s === 'all' || p.status === s).length;

  const selectedProduct = products.find((p) => p.id === productId);
  const productMfg = selectedProduct?.manufacturingStages || [];
  const productAsm = selectedProduct?.assemblyStages || [];

  const onProductChange = (id: string) => { setProductId(id); setMfgReqs({}); setAsmReqs({}); };

  const submit = async (status: 'DRAFT' | 'ACTIVE') => {
    if (!productId) { toast.error('Select product'); return; }
    setBusy(true);
    try {
      const make = (s: StageDoc, reqs: Record<string, { requirements: string; inspectorId: string }>): StageRef => {
        const r = reqs[s._id] || emptyRow;
        return { stage: s._id, inspector: r.inspectorId || undefined, notes: r.requirements || undefined, status: 'PENDING' };
      };
      await create({
        organization: user?.organization,
        qualityManager: user?.id,
        createdBy: user?.id,
        product: productId,
        manufacturingInspections: productMfg.map((s) => make(s, mfgReqs)),
        assemblyInspections: productAsm.map((s) => make(s, asmReqs)),
        finalProductInspection: { inspector: fpReq.inspectorId || undefined, notes: fpReq.requirements || undefined, status: 'PENDING' },
        status,
      } as unknown as Partial<QualityPlanDoc>);
      toast.success(status === 'DRAFT' ? 'Quality plan saved as draft' : 'Quality plan activated');
      setDrawer(false);
      setProductId(''); setMfgReqs({}); setAsmReqs({}); setFpReq({ requirements: '', inspectorId: '' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const exportRows = plans.map((p) => ({
    Plan: p.pqpId || p.id,
    Product: productOf(p).name,
    Stages: entriesOf(p).length,
    Completion: `${completionOf(p)}%`,
    PMAcknowledged: p.reviewStatus === 'COMPLETED' ? 'Yes' : 'No',
    Status: p.status,
  }));

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader title="Product Quality Plans" description="Master quality plans defining inspections across all stages." action={
        <>
          <ExportButtons data={exportRows} fileName="quality-plans" />
          <Button variant="accent" onClick={() => setDrawer(true)}><Plus className="h-4 w-4" /> Create Quality Plan</Button>
        </>
      } />

      {error && <Card className="p-4 mb-4 text-sm text-destructive">{error}</Card>}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({count('all')})</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft ({count('DRAFT')})</TabsTrigger>
          <TabsTrigger value="ACTIVE">Active ({count('ACTIVE')})</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed ({count('COMPLETED')})</TabsTrigger>
        </TabsList>
      </Tabs>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const prod = productOf(p);
          const pct = completionOf(p);
          return (
            <motion.div key={p.id} variants={staggerItem}>
              <Card className="p-5 hover:shadow-md cursor-pointer" onClick={() => setDetail(p)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{prod.name}</p>
                      <Badge variant="outline" className="font-mono text-[10px]">{p.pqpId || p.id}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.manufacturingInspections.length} mfg · {p.assemblyInspections.length} asm · final product</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.reviewStatus === 'COMPLETED' && <Badge variant="success">PM Ack</Badge>}
                    <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'ACTIVE' ? 'accent' : 'slate'}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className={cn('h-full rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-accent')} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{pct}% complete</span>
                  <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
        {!filtered.length && (
          <Card className="p-10 text-center text-sm text-muted-foreground lg:col-span-2">No quality plans found.</Card>
        )}
      </motion.div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[720px]">
        {detail && (() => {
          const prod = productOf(detail);
          return (
            <>
              <SheetHeader>
                <SheetTitle>{prod.name}</SheetTitle>
                <SheetDescription>{detail.pqpId || detail.id} · {completionOf(detail)}% complete · {detail.reviewStatus === 'COMPLETED' ? 'PM Acknowledged' : 'Awaiting PM acknowledgement'}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="space-y-5">
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full', completionOf(detail) === 100 ? 'bg-emerald-500' : 'bg-accent')} style={{ width: `${completionOf(detail)}%` }} /></div>
                  {[
                    { label: 'Manufacturing Stages', entries: detail.manufacturingInspections, cat: 'mfg' as const },
                    { label: 'Assembling Stages', entries: detail.assemblyInspections, cat: 'asm' as const },
                    { label: 'Final Product', entries: detail.finalProductInspection ? [detail.finalProductInspection] : [], cat: 'asm' as const },
                  ].map((sec, i) => (
                    <section key={i}>
                      <h4 className="font-semibold text-sm mb-2">{sec.label}</h4>
                      <div className="space-y-2">
                        {sec.entries.map((s, idx) => (
                          <div key={idx} className="p-3 rounded-lg border flex items-start gap-3">
                            <StageIndicator status={s.status} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{stageName(prod, sec.cat, s.stage) || (sec.label === 'Final Product' ? 'Final Product' : 'Stage')}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{s.notes || 'No requirements'}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{s.inspector ? `Assigned to ${inspectorsById[s.inspector] || 'Inspector'}` : 'Not assigned'}</p>
                            </div>
                            <Badge variant={s.status === 'APPROVED' ? 'success' : s.status === 'REJECTED' ? 'danger' : 'slate'}>{s.status.replace('_', ' ')}</Badge>
                          </div>
                        ))}
                        {!sec.entries.length && <p className="text-xs text-muted-foreground italic">No items</p>}
                      </div>
                    </section>
                  ))}
                </div>
              </SheetBody>
            </>
          );
        })()}
      </Sheet>

      <Sheet open={drawer} onOpenChange={busy ? () => {} : setDrawer} className="!w-[760px]">
        <SheetHeader><SheetTitle>Create Product Quality Plan</SheetTitle><SheetDescription>Define requirements and inspectors for all stages.</SheetDescription></SheetHeader>
        <SheetBody>
          <div className="space-y-5">
            <div className="space-y-1.5"><Label>Product <span className="text-destructive">*</span></Label>
              <Select value={productId} onChange={onProductChange} options={products.map((p) => ({ label: `${p.name}${p.productId ? ` (${p.productId})` : ''}`, value: p.id }))} placeholder="Select product" />
            </div>

            {selectedProduct && (
              <>
                <section className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Manufacturing Stages ({productMfg.length})</h4>
                  <div className="space-y-3">
                    {productMfg.map((s) => {
                      const v = mfgReqs[s._id] || emptyRow;
                      return (
                        <div key={s._id} className="p-3 rounded border bg-muted/30 space-y-2">
                          <p className="text-sm font-medium">{s.sequence != null ? `${s.sequence}. ` : ''}{s.name}</p>
                          <Textarea placeholder="Requirements" rows={2} value={v.requirements} onChange={(e) => setMfgReqs({ ...mfgReqs, [s._id]: { ...v, requirements: e.target.value } })} />
                          <Select value={v.inspectorId} onChange={(val) => setMfgReqs({ ...mfgReqs, [s._id]: { ...v, inspectorId: val } })} options={inspectors.map((u) => ({ label: u.name, value: u.id }))} placeholder="Inspector" />
                        </div>
                      );
                    })}
                    {!productMfg.length && <p className="text-xs text-muted-foreground italic">No manufacturing stages on this product</p>}
                  </div>
                </section>

                <section className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Assembling Stages ({productAsm.length})</h4>
                  <div className="space-y-3">
                    {productAsm.map((s) => {
                      const v = asmReqs[s._id] || emptyRow;
                      return (
                        <div key={s._id} className="p-3 rounded border bg-muted/30 space-y-2">
                          <p className="text-sm font-medium">{s.sequence != null ? `${s.sequence}. ` : ''}{s.name}</p>
                          <Textarea placeholder="Requirements" rows={2} value={v.requirements} onChange={(e) => setAsmReqs({ ...asmReqs, [s._id]: { ...v, requirements: e.target.value } })} />
                          <Select value={v.inspectorId} onChange={(val) => setAsmReqs({ ...asmReqs, [s._id]: { ...v, inspectorId: val } })} options={inspectors.map((u) => ({ label: u.name, value: u.id }))} placeholder="Inspector" />
                        </div>
                      );
                    })}
                    {!productAsm.length && <p className="text-xs text-muted-foreground italic">No assembling stages on this product</p>}
                  </div>
                </section>

                <section className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Final Product Inspection</h4>
                  <div className="space-y-2">
                    <Textarea placeholder="Requirements" rows={2} value={fpReq.requirements} onChange={(e) => setFpReq({ ...fpReq, requirements: e.target.value })} />
                    <Select value={fpReq.inspectorId} onChange={(val) => setFpReq({ ...fpReq, inspectorId: val })} options={inspectors.map((u) => ({ label: u.name, value: u.id }))} placeholder="Inspector" />
                  </div>
                </section>
              </>
            )}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setDrawer(false)} disabled={busy}>Cancel</Button>
          <Button variant="outline" onClick={() => submit('DRAFT')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Draft</Button>
          <Button variant="accent" onClick={() => submit('ACTIVE')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit for PM</Button>
        </SheetFooter>
      </Sheet>
    </PageWrapper>
  );
};
