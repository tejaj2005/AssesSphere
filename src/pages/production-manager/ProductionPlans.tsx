import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Clock, Circle, Loader2, Factory, Wrench } from 'lucide-react';
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
import { useData } from '@/context/DataContext';
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

export const ProductionPlans = () => {
  const { productionPlans, products, manufacturingStages, assemblingStages, users, roles, addProductionPlan } = useData();
  const { user } = useAuth();

  const operatorRole = roles.find((r) => r.name === 'Operator');
  const operators = useMemo(() => users.filter((u) => u.roleId === operatorRole?.id && u.status === 'Active'), [users, operatorRole]);
  // Domain split: machining work centres draw from Production, assembly from the Assembly dept.
  const machineOperators = operators.filter((u) => u.departmentId === 'DEPT-001');
  const assemblyOperators = operators.filter((u) => u.departmentId === 'DEPT-004');
  const mfgPool = machineOperators.length ? machineOperators : operators;
  const asmPool = assemblyOperators.length ? assemblyOperators : operators;

  const [tab, setTab] = useState<'all' | 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'>('all');
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState<ProductionPlan | null>(null);
  const [busy, setBusy] = useState(false);

  const [productId, setProductId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [mfgOps, setMfgOps] = useState<Record<string, string>>({});
  const [asmOps, setAsmOps] = useState<Record<string, string>>({});

  const filtered = useMemo(() => productionPlans.filter((p) => tab === 'all' || p.status === tab), [productionPlans, tab]);
  const count = (s: string) => productionPlans.filter((p) => s === 'all' || p.status === s).length;

  const selectedProduct = products.find((p) => p.id === productId);
  const productMfg = selectedProduct ? manufacturingStages.filter((s) => selectedProduct.manufacturingStageIds.includes(s.id)).sort((a, b) => a.order - b.order) : [];
  const productAsm = selectedProduct ? assemblingStages.filter((s) => selectedProduct.assemblingStageIds.includes(s.id)).sort((a, b) => a.order - b.order) : [];

  const onProductChange = (id: string) => { setProductId(id); setMfgOps({}); setAsmOps({}); };

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
    if (status === 'SCHEDULED' && (productMfg.some((s) => !mfgOps[s.id]) || productAsm.some((s) => !asmOps[s.id]))) {
      toast.error('Assign an operator to every stage before scheduling');
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    const prod = selectedProduct!;
    const makeStage = (s: typeof manufacturingStages[number], opId: string, type: ProductionStageAssignment['stageType']): ProductionStageAssignment => {
      const op = operators.find((u) => u.id === opId);
      return { stageId: s.id, stageName: s.name, stageType: type, order: s.order, workCenter: s.workCenter, standardTimeMin: s.standardTimeMin, operatorId: op?.id, operatorName: op?.name, status: 'NOT_STARTED' };
    };
    addProductionPlan({
      productId: prod.id, productName: prod.name, productCode: prod.code,
      targetQuantity: qty,
      plannedStartDate: new Date(startDate).toISOString(),
      plannedEndDate: new Date(endDate).toISOString(),
      manufacturingStages: productMfg.map((s) => makeStage(s, mfgOps[s.id] || '', 'MANUFACTURING')),
      assemblingStages: productAsm.map((s) => makeStage(s, asmOps[s.id] || '', 'ASSEMBLING')),
      status, notes: notes.trim() || undefined,
      createdBy: user?.name || 'Production Manager',
    });
    toast.success(status === 'DRAFT' ? 'Production plan saved as draft' : 'Production plan scheduled');
    setBusy(false); setDrawer(false); resetForm();
  };

  const exportRows = productionPlans.map((p) => ({
    Plan: p.planCode, Product: p.productName, Quantity: p.targetQuantity,
    Stages: p.manufacturingStages.length + p.assemblingStages.length,
    Start: formatDate(p.plannedStartDate), End: formatDate(p.plannedEndDate),
    Completion: `${completion(p)}%`, Status: p.status,
  }));

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
              <Card className="p-5 hover:shadow-md cursor-pointer" onClick={() => setDetail(p)}>
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
                  <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'IN_PROGRESS' ? 'accent' : p.status === 'SCHEDULED' ? 'warning' : 'slate'}>
                    {p.status.replace('_', ' ')}
                  </Badge>
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
              <Select value={productId} onChange={onProductChange} options={products.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))} placeholder="Select product" />
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
                    {productMfg.map((s) => (
                      <div key={s.id} className="p-3 rounded border bg-muted/30 space-y-2">
                        <p className="text-sm font-medium">{s.order}. {s.name} <span className="text-[10px] text-muted-foreground font-normal">· {s.workCenter}</span></p>
                        <Select value={mfgOps[s.id] || ''} onChange={(val) => setMfgOps({ ...mfgOps, [s.id]: val })} options={mfgPool.map((u) => ({ label: `${u.name}${u.designation ? ` — ${u.designation}` : ''}`, value: u.id }))} placeholder="Assign operator" />
                      </div>
                    ))}
                    {!productMfg.length && <p className="text-xs text-muted-foreground">This product has no machining stages.</p>}
                  </div>
                </section>

                <section className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground" /> Assembling Stages ({productAsm.length})</h4>
                  <div className="space-y-3">
                    {productAsm.map((s) => (
                      <div key={s.id} className="p-3 rounded border bg-muted/30 space-y-2">
                        <p className="text-sm font-medium">{s.order}. {s.name} <span className="text-[10px] text-muted-foreground font-normal">· {s.workCenter}</span></p>
                        <Select value={asmOps[s.id] || ''} onChange={(val) => setAsmOps({ ...asmOps, [s.id]: val })} options={asmPool.map((u) => ({ label: `${u.name}${u.designation ? ` — ${u.designation}` : ''}`, value: u.id }))} placeholder="Assign operator" />
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
    </PageWrapper>
  );
};
