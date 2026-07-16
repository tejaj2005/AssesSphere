import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Clock, Circle, Loader2, Factory, Wrench, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useApiResource } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { formatDate, cn } from '@/lib/utils';
import type { ProductionPlan, ProductionStageAssignment, ProductionStageStatus } from '@/types';

const StageIcon = ({ status }: { status: ProductionStageStatus }) => {
  const map = {
    COMPLETED:   { Icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
    IN_PROGRESS: { Icon: Clock,        cls: 'text-accent' },
    NOT_STARTED: { Icon: Circle,       cls: 'text-muted-foreground' },
  }[status];
  const { Icon, cls } = map;
  return <Icon className={cn('h-4 w-4 shrink-0', cls)} />;
};

const completion = (p: ProductionPlan) => {
  const stages = [...p.manufacturingStages, ...p.assemblingStages];
  if (!stages.length) return 0;
  return Math.round((stages.filter((s) => s.status === 'COMPLETED').length / stages.length) * 100);
};

/** Maps a raw stage-assignment sub-doc (from ProductionPlan.manufacturingStages/assemblingStages)
 * into the mock-shaped `ProductionStageAssignment` the existing JSX was written against.
 * `stage` may be a populated object (single-plan GET) or a bare ObjectId string (list GET). */
const toStageView = (s: any, stageType: ProductionStageAssignment['stageType']): ProductionStageAssignment => {
  const stageObj = typeof s.stage === 'object' && s.stage ? s.stage : null;
  const opObj = typeof s.operator === 'object' && s.operator ? s.operator : null;
  return {
    stageId: stageObj?._id || s.stage || '',
    stageName: stageObj?.name || '',
    stageType,
    order: s.order ?? stageObj?.sequence ?? 0,
    workCenter: s.workCenter || stageObj?.workCenter,
    standardTimeMin: s.standardTimeMin ?? stageObj?.standardTimeMin,
    operatorId: opObj?._id || (typeof s.operator === 'string' ? s.operator : undefined),
    operatorName: opObj?.name,
    status: s.status,
  };
};

/** Maps a raw ProductionPlan API doc into the mock-shaped `ProductionPlan` view type. */
const toPlanView = (raw: any): ProductionPlan => {
  const prod = typeof raw.product === 'object' && raw.product ? raw.product : null;
  const creator = typeof raw.createdBy === 'object' && raw.createdBy ? raw.createdBy : null;
  return {
    id: raw._id || raw.id,
    planCode: raw.planId || '',
    productId: prod?._id || raw.product || '',
    productName: prod?.name || '',
    productCode: prod?.productId || '',
    targetQuantity: raw.targetQuantity,
    plannedStartDate: raw.plannedStartDate,
    plannedEndDate: raw.plannedEndDate,
    manufacturingStages: (raw.manufacturingStages || []).map((s: any) => toStageView(s, 'MANUFACTURING')),
    assemblingStages: (raw.assemblingStages || []).map((s: any) => toStageView(s, 'ASSEMBLING')),
    status: raw.status,
    notes: raw.notes,
    createdBy: creator?.name || raw.createdBy || '',
    createdAt: raw.createdAt,
  };
};

export const ProductionPlans = () => {
  const { user } = useAuth();
  const { items: rawPlans, loading, create, remove } = useApiResource<any>(
    '/production-plans',
    user?.organization ? { organization: user.organization } : undefined
  );

  const [products, setProducts] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, u] = await Promise.all([
          api.getList<any>('/admin/products?limit=500'),
          api.getList<any>('/admin/users?limit=500'),
        ]);
        if (!active) return;
        setProducts(p.data);
        // No dedicated shop-floor "Operator" role exists on the backend (only the 6 app
        // roles) — fall back to every active user in the org as the assignable pool.
        setOperators(u.data.filter((x: any) => x.isActive));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load products/users');
      } finally {
        if (active) setLookupsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const productionPlans = useMemo(() => rawPlans.map(toPlanView), [rawPlans]);

  const [tab, setTab] = useState<'all' | 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'>('all');
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState<ProductionPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<ProductionPlan | null>(null);

  const [productId, setProductId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [mfgOps, setMfgOps] = useState<Record<string, string>>({});
  const [asmOps, setAsmOps] = useState<Record<string, string>>({});

  const filtered = useMemo(() => productionPlans.filter((p) => tab === 'all' || p.status === tab), [productionPlans, tab]);
  const count = (s: string) => productionPlans.filter((p) => s === 'all' || p.status === s).length;

  const selectedProduct = products.find((p) => p._id === productId);
  const productMfg = useMemo(
    () => (selectedProduct?.manufacturingStages || []).slice().sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    [selectedProduct]
  );
  const productAsm = useMemo(
    () => (selectedProduct?.assemblyStages || []).slice().sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    [selectedProduct]
  );

  const onProductChange = (id: string) => { setProductId(id); setMfgOps({}); setAsmOps({}); };

  /** The list endpoint doesn't populate stage refs (only operator/product names), so stage
   * names would be blank in the detail sheet. Open with the list version immediately, then
   * swap in the fully-populated single-plan GET when it arrives. */
  const openDetail = (p: ProductionPlan) => {
    setDetail(p);
    api.get<any>(`/production-plans/${p.id}`)
      .then((full) => setDetail((cur) => (cur && cur.id === p.id ? toPlanView(full) : cur)))
      .catch(() => { /* keep the list-derived view */ });
  };

  const resetForm = () => {
    setProductId(''); setTargetQuantity(''); setNotes('');
    setStartDate(format(new Date(), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setMfgOps({}); setAsmOps({});
  };

  const submit = async (status: 'DRAFT' | 'SCHEDULED') => {
    if (!productId) { toast.error('Select a product'); return; }
    const qty = Number(targetQuantity);
    if (!qty || qty <= 0) { toast.error('Enter a valid target quantity'); return; }
    if (new Date(endDate) < new Date(startDate)) { toast.error('End date cannot be before start date'); return; }
    if (status === 'SCHEDULED' && (productMfg.some((s: any) => !mfgOps[s._id]) || productAsm.some((s: any) => !asmOps[s._id]))) {
      toast.error('Assign an operator to every stage before scheduling');
      return;
    }
    if (!user?.organization) { toast.error('Missing organization context'); return; }
    setBusy(true);
    const makeStage = (s: any, opId: string, stageType: ProductionStageAssignment['stageType']) => ({
      stage: s._id, stageType, order: s.sequence ?? 0, workCenter: s.workCenter,
      standardTimeMin: s.standardTimeMin, operator: opId || undefined, status: 'NOT_STARTED',
    });
    try {
      await create({
        product: productId,
        targetQuantity: qty,
        plannedStartDate: new Date(startDate).toISOString(),
        plannedEndDate: new Date(endDate).toISOString(),
        manufacturingStages: productMfg.map((s: any) => makeStage(s, mfgOps[s._id] || '', 'MANUFACTURING')),
        assemblingStages: productAsm.map((s: any) => makeStage(s, asmOps[s._id] || '', 'ASSEMBLING')),
        status, notes: notes.trim() || undefined,
        organization: user.organization,
        createdBy: user.id,
      });
      toast.success(status === 'DRAFT' ? 'Production plan saved as draft' : 'Production plan scheduled');
      setDrawer(false); resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!confirmDel) return;
    if (confirmDel.status !== 'DRAFT') {
      toast.error('Only DRAFT plans can be deleted');
      setConfirmDel(null);
      return;
    }
    try {
      await remove(confirmDel.id);
      toast.success('Production plan deleted');
      setDetail(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
    setConfirmDel(null);
  }, [confirmDel, remove]);

  const exportRows = productionPlans.map((p) => ({
    Plan: p.planCode, Product: p.productName, Quantity: p.targetQuantity,
    Stages: p.manufacturingStages.length + p.assemblingStages.length,
    Start: formatDate(p.plannedStartDate), End: formatDate(p.plannedEndDate),
    Completion: `${completion(p)}%`, Status: p.status,
  }));

  if (loading || lookupsLoading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader title="Production Plans" description="Schedule product builds and assign operators to each machining and assembling stage." action={
        <>
          <ExportButtons data={exportRows} fileName="production-plans" />
          <Button variant="accent" onClick={() => setDrawer(true)}><Plus className="h-4 w-4" /> Create Production Plan</Button>
        </>
      } />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({count('all')})</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft ({count('DRAFT')})</TabsTrigger>
          <TabsTrigger value="SCHEDULED">Scheduled ({count('SCHEDULED')})</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">In Progress ({count('IN_PROGRESS')})</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed ({count('COMPLETED')})</TabsTrigger>
        </TabsList>
      </Tabs>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const pct = completion(p);
          const totalStages = p.manufacturingStages.length + p.assemblingStages.length;
          return (
            <motion.div key={p.id} variants={staggerItem}>
              <Card className="p-5 hover:shadow-md cursor-pointer" onClick={() => openDetail(p)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{p.productName}</p>
                      <Badge variant="outline" className="font-mono text-[10px]">{p.planCode}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.targetQuantity} units · {p.manufacturingStages.length} machining · {p.assemblingStages.length} assembling
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'IN_PROGRESS' ? 'accent' : p.status === 'SCHEDULED' ? 'warning' : 'slate'}>
                      {p.status.replace('_', ' ')}
                    </Badge>
                    {p.status === 'DRAFT' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmDel(p); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className={cn('h-full rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-accent')} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{pct}% complete · {totalStages} stages</span>
                  <span>{formatDate(p.plannedStartDate)} → {formatDate(p.plannedEndDate)}</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
        {!filtered.length && (
          <Card className="p-10 text-center text-sm text-muted-foreground lg:col-span-2">No production plans in this view.</Card>
        )}
      </motion.div>

      {/* Detail */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[720px]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.productName}</SheetTitle>
              <SheetDescription>{detail.planCode} · {detail.targetQuantity} units · {completion(detail)}% complete</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="space-y-5">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Product Code</dt><dd className="mt-1 font-mono">{detail.productCode}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt><dd className="mt-1"><Badge variant={detail.status === 'COMPLETED' ? 'success' : detail.status === 'IN_PROGRESS' ? 'accent' : detail.status === 'SCHEDULED' ? 'warning' : 'slate'}>{detail.status.replace('_', ' ')}</Badge></dd></div>
                  <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Planned Start</dt><dd className="mt-1">{formatDate(detail.plannedStartDate)}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Planned End</dt><dd className="mt-1">{formatDate(detail.plannedEndDate)}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Created By</dt><dd className="mt-1">{detail.createdBy}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Created</dt><dd className="mt-1">{formatDate(detail.createdAt)}</dd></div>
                </dl>

                {detail.notes && <p className="text-sm text-muted-foreground border rounded-lg p-3 bg-muted/30">{detail.notes}</p>}

                {[
                  { label: 'Machining Stages', Icon: Factory, stages: detail.manufacturingStages },
                  { label: 'Assembling Stages', Icon: Wrench, stages: detail.assemblingStages },
                ].map((sec) => (
                  <section key={sec.label}>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><sec.Icon className="h-4 w-4 text-muted-foreground" /> {sec.label} ({sec.stages.length})</h4>
                    <div className="space-y-2">
                      {sec.stages.map((s) => (
                        <div key={s.stageId} className="p-3 rounded-lg border flex items-center gap-3">
                          <StageIcon status={s.status} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{s.order}. {s.stageName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{s.workCenter || '—'}{s.standardTimeMin ? ` · ${s.standardTimeMin} min/unit` : ''}</p>
                          </div>
                          {s.operatorName ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <Avatar name={s.operatorName} size="sm" />
                              <span className="text-xs font-medium">{s.operatorName}</span>
                            </div>
                          ) : <Badge variant="slate">Unassigned</Badge>}
                        </div>
                      ))}
                      {!sec.stages.length && <p className="text-xs text-muted-foreground">No stages.</p>}
                    </div>
                  </section>
                ))}
              </div>
            </SheetBody>
            {detail.status === 'DRAFT' && (
              <SheetFooter>
                <Button variant="destructive" onClick={() => setConfirmDel(detail)}><Trash2 className="h-4 w-4" /> Delete Plan</Button>
              </SheetFooter>
            )}
          </>
        )}
      </Sheet>

      {/* Create */}
      <Sheet open={drawer} onOpenChange={busy ? () => {} : (o) => { setDrawer(o); if (!o) resetForm(); }} className="!w-[760px]">
        <SheetHeader><SheetTitle>Create Production Plan</SheetTitle><SheetDescription>Schedule a build and assign an operator to every machining and assembling stage.</SheetDescription></SheetHeader>
        <SheetBody>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Product <span className="text-destructive">*</span></Label>
              <Select value={productId} onChange={onProductChange} options={products.map((p) => ({ label: `${p.name} (${p.productId})`, value: p._id }))} placeholder="Select product" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Target Qty <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} value={targetQuantity} onChange={(e) => setTargetQuantity(e.target.value)} placeholder="e.g. 100" />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date <span className="text-destructive">*</span></Label>
                <DatePicker value={startDate} onChange={setStartDate} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date <span className="text-destructive">*</span></Label>
                <DatePicker value={endDate} onChange={setEndDate} />
              </div>
            </div>

            {selectedProduct && (
              <>
                <section className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Factory className="h-4 w-4 text-muted-foreground" /> Machining Stages ({productMfg.length})</h4>
                  <div className="space-y-3">
                    {productMfg.map((s: any) => (
                      <div key={s._id} className="p-3 rounded border bg-muted/30 space-y-2">
                        <p className="text-sm font-medium">{s.sequence}. {s.name} <span className="text-[10px] text-muted-foreground font-normal">· {s.workCenter}</span></p>
                        <Select value={mfgOps[s._id] || ''} onChange={(val) => setMfgOps({ ...mfgOps, [s._id]: val })} options={operators.map((u) => ({ label: `${u.name}${u.department ? ` — ${u.department}` : ''}`, value: u._id }))} placeholder="Assign operator" />
                      </div>
                    ))}
                    {!productMfg.length && <p className="text-xs text-muted-foreground">This product has no machining stages.</p>}
                  </div>
                </section>

                <section className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground" /> Assembling Stages ({productAsm.length})</h4>
                  <div className="space-y-3">
                    {productAsm.map((s: any) => (
                      <div key={s._id} className="p-3 rounded border bg-muted/30 space-y-2">
                        <p className="text-sm font-medium">{s.sequence}. {s.name} <span className="text-[10px] text-muted-foreground font-normal">· {s.workCenter}</span></p>
                        <Select value={asmOps[s._id] || ''} onChange={(val) => setAsmOps({ ...asmOps, [s._id]: val })} options={operators.map((u) => ({ label: `${u.name}${u.department ? ` — ${u.department}` : ''}`, value: u._id }))} placeholder="Assign operator" />
                      </div>
                    ))}
                    {!productAsm.length && <p className="text-xs text-muted-foreground">This product has no assembling stages.</p>}
                  </div>
                </section>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional planning notes" />
                </div>
              </>
            )}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => { setDrawer(false); resetForm(); }} disabled={busy}>Cancel</Button>
          <Button variant="outline" onClick={() => submit('DRAFT')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Draft</Button>
          <Button variant="accent" onClick={() => submit('SCHEDULED')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Schedule Plan</Button>
        </SheetFooter>
      </Sheet>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete production plan?"
        description="Only DRAFT plans can be deleted. This action cannot be undone."
        entityName={confirmDel?.planCode}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
};
