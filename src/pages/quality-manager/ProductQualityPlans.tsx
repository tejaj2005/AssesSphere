import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronDown, CheckCircle2, Clock, Circle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { formatDate, cn } from '@/lib/utils';
import type { ProductQualityPlan, QualityPlanStage } from '@/types';

const StageIndicator = ({ status }: { status: QualityPlanStage['reportStatus'] }) => {
  const map = {
    APPROVED:    { Icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
    SUBMITTED:   { Icon: Clock,        cls: 'text-amber-600 dark:text-amber-400' },
    IN_PROGRESS: { Icon: Clock,        cls: 'text-accent' },
    NOT_STARTED: { Icon: Circle,       cls: 'text-muted-foreground' },
    REJECTED:    { Icon: XCircle,      cls: 'text-red-600 dark:text-red-400' },
  }[status];
  const { Icon, cls } = map;
  return <Icon className={cn('h-4 w-4', cls)} />;
};

export const ProductQualityPlans = () => {
  const { qualityPlans, products, manufacturingStages, assemblingStages, checklists, equipment, users, roles, addQualityPlan } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState<'all' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'>('all');
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState<ProductQualityPlan | null>(null);
  const [productId, setProductId] = useState('');
  const [busy, setBusy] = useState(false);
  const inspectorRole = roles.find((r) => r.name === 'Inspector');
  const inspectors = users.filter((u) => u.roleId === inspectorRole?.id);

  const filtered = useMemo(() => qualityPlans.filter((p) => tab === 'all' || p.status === tab), [qualityPlans, tab]);
  const count = (s: string) => qualityPlans.filter((p) => s === 'all' || p.status === s).length;

  const selectedProduct = products.find((p) => p.id === productId);
  const [mfgReqs, setMfgReqs] = useState<Record<string, { requirements: string; checklistId: string; equipmentIds: string[]; inspectorId: string }>>({});
  const [asmReqs, setAsmReqs] = useState<Record<string, { requirements: string; checklistId: string; equipmentIds: string[]; inspectorId: string }>>({});
  const [fpReq, setFpReq]     = useState({ requirements: '', checklistId: '', equipmentIds: [] as string[], inspectorId: '' });

  const onProductChange = (id: string) => { setProductId(id); setMfgReqs({}); setAsmReqs({}); };
  const productMfg = selectedProduct ? manufacturingStages.filter((s) => selectedProduct.manufacturingStageIds.includes(s.id)) : [];
  const productAsm = selectedProduct ? assemblingStages.filter((s) => selectedProduct.assemblingStageIds.includes(s.id)) : [];

  const submit = async (status: 'DRAFT' | 'IN_PROGRESS') => {
    if (!productId) { toast.error('Select product'); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    const prod = selectedProduct!;
    const make = (s: any, reqs: any): QualityPlanStage => {
      const r = reqs[s.id] || { requirements: '', equipmentIds: [], inspectorId: '' };
      const insp = inspectors.find((u) => u.id === r.inspectorId);
      const cl = checklists.find((c) => c.id === r.checklistId);
      return { stageId: s.id, stageName: s.name, requirements: r.requirements, equipmentIds: r.equipmentIds, checklistId: r.checklistId, checklistName: cl?.checklistCode, inspectorId: insp?.id, inspectorName: insp?.name, reportStatus: 'NOT_STARTED' };
    };
    const insp = inspectors.find((u) => u.id === fpReq.inspectorId);
    const cl = checklists.find((c) => c.id === fpReq.checklistId);
    addQualityPlan({
      date: new Date().toISOString(), productId: prod.id, productName: prod.name, productCode: prod.code,
      manufacturingStages: productMfg.map((s) => make(s, mfgReqs)),
      assemblingStages: productAsm.map((s) => make(s, asmReqs)),
      finishedProduct: { stageId: 'FP', stageName: 'Final Product', requirements: fpReq.requirements, equipmentIds: fpReq.equipmentIds, checklistId: fpReq.checklistId, checklistName: cl?.checklistCode, inspectorId: insp?.id, inspectorName: insp?.name, reportStatus: 'NOT_STARTED' },
      reviewerId: user?.id || 'U-005', reviewerName: user?.name || 'QM',
      status, pmAcknowledged: false, completionPercentage: 0,
    });
    toast.success(status === 'DRAFT' ? 'Quality plan saved as draft' : 'Quality plan submitted for PM acknowledgement');
    setBusy(false); setDrawer(false);
    setProductId(''); setMfgReqs({}); setAsmReqs({}); setFpReq({ requirements: '', checklistId: '', equipmentIds: [], inspectorId: '' });
  };

  const exportRows = qualityPlans.map((p) => ({ Plan: p.planCode, Product: p.productName, Stages: p.manufacturingStages.length + p.assemblingStages.length, Completion: `${p.completionPercentage}%`, PMAcknowledged: p.pmAcknowledged ? 'Yes' : 'No', Status: p.status }));

  return (
    <PageWrapper>
      <PageHeader title="Product Quality Plans" description="Master quality plans defining inspections across all stages." action={
        <>
          <ExportButtons data={exportRows} fileName="quality-plans" />
          <Button variant="accent" onClick={() => setDrawer(true)}><Plus className="h-4 w-4" /> Create Quality Plan</Button>
        </>
      } />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({count('all')})</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft ({count('DRAFT')})</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">In Progress ({count('IN_PROGRESS')})</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed ({count('COMPLETED')})</TabsTrigger>
        </TabsList>
      </Tabs>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <motion.div key={p.id} variants={staggerItem}>
            <Card className="p-5 hover:shadow-md cursor-pointer" onClick={() => setDetail(p)}>
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">{p.productName}</p>
                    <Badge variant="outline" className="font-mono text-[10px]">{p.planCode}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.manufacturingStages.length} mfg · {p.assemblingStages.length} asm · final product</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.pmAcknowledged && <Badge variant="success">PM Ack</Badge>}
                  <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'IN_PROGRESS' ? 'accent' : 'slate'}>{p.status.replace('_', ' ')}</Badge>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                <motion.div initial={{ width: 0 }} animate={{ width: `${p.completionPercentage}%` }} transition={{ duration: 0.6 }} className={cn('h-full rounded-full', p.completionPercentage === 100 ? 'bg-emerald-500' : 'bg-accent')} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{p.completionPercentage}% complete</span>
                <span className="text-muted-foreground">{formatDate(p.date)}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[720px]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.productName}</SheetTitle>
              <SheetDescription>{detail.planCode} · {detail.completionPercentage}% complete · {detail.pmAcknowledged ? 'PM Acknowledged' : 'Awaiting PM acknowledgement'}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="space-y-5">
                <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full', detail.completionPercentage === 100 ? 'bg-emerald-500' : 'bg-accent')} style={{ width: `${detail.completionPercentage}%` }} /></div>
                {[
                  { label: 'Manufacturing Stages', stages: detail.manufacturingStages },
                  { label: 'Assembling Stages', stages: detail.assemblingStages },
                  { label: 'Final Product', stages: [detail.finishedProduct] },
                ].map((sec, i) => (
                  <section key={i}>
                    <h4 className="font-semibold text-sm mb-2">{sec.label}</h4>
                    <div className="space-y-2">
                      {sec.stages.map((s) => (
                        <div key={s.stageId} className="p-3 rounded-lg border flex items-start gap-3">
                          <StageIndicator status={s.reportStatus} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{s.stageName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.requirements || 'No requirements'}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{s.inspectorName ? `Assigned to ${s.inspectorName}` : 'Not assigned'} · {s.checklistName || 'no checklist'}</p>
                          </div>
                          <Badge variant={s.reportStatus === 'APPROVED' ? 'success' : s.reportStatus === 'REJECTED' ? 'danger' : s.reportStatus === 'NOT_STARTED' ? 'slate' : 'warning'}>{s.reportStatus.replace('_', ' ')}</Badge>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </SheetBody>
          </>
        )}
      </Sheet>

      <Sheet open={drawer} onOpenChange={busy ? () => {} : setDrawer} className="!w-[760px]">
        <SheetHeader><SheetTitle>Create Product Quality Plan</SheetTitle><SheetDescription>Define requirements, equipment and inspectors for all stages.</SheetDescription></SheetHeader>
        <SheetBody>
          <div className="space-y-5">
            <div className="space-y-1.5"><Label>Product <span className="text-destructive">*</span></Label>
              <Select value={productId} onChange={onProductChange} options={products.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))} placeholder="Select product" />
            </div>

            {selectedProduct && (
              <>
                <section className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Manufacturing Stages ({productMfg.length})</h4>
                  <div className="space-y-3">
                    {productMfg.map((s) => {
                      const v = mfgReqs[s.id] || { requirements: '', checklistId: '', equipmentIds: [], inspectorId: '' };
                      return (
                        <div key={s.id} className="p-3 rounded border bg-muted/30 space-y-2">
                          <p className="text-sm font-medium">{s.order}. {s.name}</p>
                          <Textarea placeholder="Requirements" rows={2} value={v.requirements} onChange={(e) => setMfgReqs({ ...mfgReqs, [s.id]: { ...v, requirements: e.target.value } })} />
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={v.checklistId} onChange={(val) => setMfgReqs({ ...mfgReqs, [s.id]: { ...v, checklistId: val } })} options={checklists.filter((c) => c.type === 'MANUFACTURING').map((c) => ({ label: c.checklistCode, value: c.id }))} placeholder="Checklist (optional)" />
                            <Select value={v.inspectorId} onChange={(val) => setMfgReqs({ ...mfgReqs, [s.id]: { ...v, inspectorId: val } })} options={inspectors.map((u) => ({ label: u.name, value: u.id }))} placeholder="Inspector" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Assembling Stages ({productAsm.length})</h4>
                  <div className="space-y-3">
                    {productAsm.map((s) => {
                      const v = asmReqs[s.id] || { requirements: '', checklistId: '', equipmentIds: [], inspectorId: '' };
                      return (
                        <div key={s.id} className="p-3 rounded border bg-muted/30 space-y-2">
                          <p className="text-sm font-medium">{s.order}. {s.name}</p>
                          <Textarea placeholder="Requirements" rows={2} value={v.requirements} onChange={(e) => setAsmReqs({ ...asmReqs, [s.id]: { ...v, requirements: e.target.value } })} />
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={v.checklistId} onChange={(val) => setAsmReqs({ ...asmReqs, [s.id]: { ...v, checklistId: val } })} options={checklists.filter((c) => c.type === 'ASSEMBLING').map((c) => ({ label: c.checklistCode, value: c.id }))} placeholder="Checklist (optional)" />
                            <Select value={v.inspectorId} onChange={(val) => setAsmReqs({ ...asmReqs, [s.id]: { ...v, inspectorId: val } })} options={inspectors.map((u) => ({ label: u.name, value: u.id }))} placeholder="Inspector" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Final Product Inspection</h4>
                  <div className="space-y-2">
                    <Textarea placeholder="Requirements" rows={2} value={fpReq.requirements} onChange={(e) => setFpReq({ ...fpReq, requirements: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={fpReq.checklistId} onChange={(val) => setFpReq({ ...fpReq, checklistId: val })} options={checklists.filter((c) => c.type === 'FINAL_PRODUCT').map((c) => ({ label: c.checklistCode, value: c.id }))} placeholder="Final checklist" />
                      <Select value={fpReq.inspectorId} onChange={(val) => setFpReq({ ...fpReq, inspectorId: val })} options={inspectors.map((u) => ({ label: u.name, value: u.id }))} placeholder="Inspector" />
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setDrawer(false)} disabled={busy}>Cancel</Button>
          <Button variant="outline" onClick={() => submit('DRAFT')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Draft</Button>
          <Button variant="accent" onClick={() => submit('IN_PROGRESS')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit for PM</Button>
        </SheetFooter>
      </Sheet>
    </PageWrapper>
  );
};
