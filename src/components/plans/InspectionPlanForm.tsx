import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import type { InspectionPlan, InspectionParameter, PlanType, PlanStatus } from '@/types';

interface InspectionPlanFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: PlanType;
  editing?: InspectionPlan | null;
}

const blankParam = (): InspectionParameter => ({
  id: `tmp-${Math.random().toString(36).slice(2, 8)}`,
  description: '', equipmentId: '', equipmentName: '',
  parameterName: '', unit: '', targetValue: 0,
});

export const InspectionPlanForm = ({ open, onOpenChange, type, editing }: InspectionPlanFormProps) => {
  const { products, manufacturingStages, assemblingStages, components, materials, materialTypes, suppliers, equipment, users, roles, addInspectionPlan, updateInspectionPlan } = useData();
  const { user } = useAuth();
  const inspectorRole = roles.find((r) => r.name === 'Inspector');
  const inspectors = users.filter((u) => u.roleId === inspectorRole?.id && u.status === 'Active');

  const [form, setForm] = useState({
    productId: '', stageId: '', componentId: '', materialId: '', supplierId: '', materialType: '',
    assemblingResource: '', inspectorId: '', inspectionDate: new Date().toISOString().slice(0, 10),
  });
  const [params, setParams] = useState<InspectionParameter[]>([blankParam()]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        productId: editing.productId, stageId: editing.stageId || '', componentId: editing.componentId || '',
        materialId: editing.materialId || '', supplierId: editing.supplierId || '', materialType: editing.materialType || '',
        assemblingResource: editing.assemblingResource || '',
        inspectorId: editing.inspectorId || '', inspectionDate: editing.inspectionDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      });
      setParams(editing.parameters.length ? editing.parameters : [blankParam()]);
    } else {
      setForm({ productId: '', stageId: '', componentId: '', materialId: '', supplierId: '', materialType: '', assemblingResource: '', inspectorId: '', inspectionDate: new Date().toISOString().slice(0, 10) });
      setParams([blankParam()]);
    }
    setErrs({});
  }, [editing, open]);

  const product = products.find((p) => p.id === form.productId);
  const availableStages = (() => {
    if (!product) return [];
    if (type === 'MANUFACTURING') return manufacturingStages.filter((s) => product.manufacturingStageIds.includes(s.id));
    if (type === 'ASSEMBLING') return assemblingStages.filter((s) => product.assemblingStageIds.includes(s.id));
    return [];
  })();
  const availableComponents = components.filter((c) => c.productId === form.productId);

  const updateParam = (i: number, patch: Partial<InspectionParameter>) =>
    setParams((p) => p.map((x, ix) => (ix === i ? { ...x, ...patch } : x)));

  const addParam = () => setParams((p) => [...p, blankParam()]);
  const removeParam = (i: number) => setParams((p) => p.filter((_, ix) => ix !== i));

  const validate = (isSubmit: boolean) => {
    const e: Record<string, string> = {};
    if (!form.productId) e.productId = 'Required';
    if (type === 'MANUFACTURING' || type === 'ASSEMBLING') { if (!form.stageId) e.stageId = 'Required'; }
    if (type === 'COMPONENT') { if (!form.componentId) e.componentId = 'Required'; }
    if (type === 'MATERIAL') { if (!form.materialId) e.materialId = 'Required'; if (!form.supplierId) e.supplierId = 'Required'; }
    if (params.length === 0) e.params = 'Min 1 parameter';
    params.forEach((p, i) => {
      if (!p.parameterName.trim()) e[`p${i}_name`] = 'Required';
      if (!p.equipmentId) e[`p${i}_eq`] = 'Required';
      if (!p.unit.trim()) e[`p${i}_unit`] = 'Required';
      if (p.targetValue == null || isNaN(p.targetValue as any)) e[`p${i}_tgt`] = 'Required';
      // Calibration check
      const eq = equipment.find((x) => x.id === p.equipmentId);
      if (eq && eq.calibrationStatus !== 'COMPLETED') e[`p${i}_eq`] = 'Equipment uncalibrated';
    });
    if (isSubmit && !form.inspectorId) e.inspectorId = 'Required to submit';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const save = async (status: PlanStatus) => {
    const isSubmit = status !== 'DRAFT';
    if (!validate(isSubmit)) { toast.error('Please fix the form errors'); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));

    const stage = availableStages.find((s) => s.id === form.stageId);
    const comp = components.find((c) => c.id === form.componentId);
    const mat = materials.find((m) => m.id === form.materialId);
    const sup = suppliers.find((s) => s.id === form.supplierId);
    const inspector = inspectors.find((u) => u.id === form.inspectorId);

    const data: Omit<InspectionPlan, 'id' | 'createdAt' | 'planCode'> & { planCode?: string } = {
      type,
      productId: form.productId,
      productName: product?.name || '',
      stageId: stage?.id, stageName: stage?.name,
      componentId: comp?.id, componentName: comp?.name,
      materialId: mat?.id, materialName: mat?.name,
      supplierId: sup?.id, supplierName: sup?.name,
      materialType: form.materialType, assemblingResource: form.assemblingResource,
      parameters: params.map((p) => ({
        ...p,
        equipmentName: equipment.find((e) => e.id === p.equipmentId)?.name || p.equipmentName,
      })),
      inspectorId: inspector?.id, inspectorName: inspector?.name,
      inspectionDate: form.inspectionDate,
      status,
      createdBy: user?.name || 'System',
    };

    const res = editing
      ? updateInspectionPlan(editing.id, { ...data, planCode: editing.planCode })
      : addInspectionPlan(data as any);
    setBusy(false);
    if (!res.success) { toast.error(res.error || 'Failed'); return; }
    toast.success(editing ? 'Plan updated' : status === 'DRAFT' ? 'Plan saved as draft' : 'Plan submitted for review');
    onOpenChange(false);
  };

  const typeLabel = type === 'MANUFACTURING' ? 'Manufacturing' : type === 'ASSEMBLING' ? 'Assembling' : type === 'MATERIAL' ? 'Material' : 'Component';

  return (
    <Sheet open={open} onOpenChange={busy ? () => {} : onOpenChange} className="!w-[640px]">
      <SheetHeader>
        <SheetTitle>{editing ? `Edit ${editing.planCode}` : `Create ${typeLabel} Inspection Plan`}</SheetTitle>
        <SheetDescription>Define inspection parameters, equipment and inspector.</SheetDescription>
      </SheetHeader>
      <SheetBody>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product <span className="text-destructive">*</span></Label>
            <Select value={form.productId} onChange={(v) => setForm({ ...form, productId: v, stageId: '', componentId: '' })} options={products.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))} error={!!errs.productId} placeholder="Select product" />
            {form.productId && <p className="text-[10px] font-mono text-muted-foreground">ID: {form.productId}</p>}
            {errs.productId && <p className="text-xs text-destructive">{errs.productId}</p>}
          </div>

          {(type === 'MANUFACTURING' || type === 'ASSEMBLING') && (
            <div className="space-y-1.5">
              <Label>{type === 'MANUFACTURING' ? 'Manufacturing' : 'Assembling'} Stage <span className="text-destructive">*</span></Label>
              <Select value={form.stageId} onChange={(v) => setForm({ ...form, stageId: v })} options={availableStages.map((s) => ({ label: s.name, value: s.id }))} error={!!errs.stageId} placeholder={form.productId ? 'Select stage' : 'Select product first'} disabled={!form.productId} />
              {form.stageId && <p className="text-[10px] font-mono text-muted-foreground">ID: {form.stageId}</p>}
              {errs.stageId && <p className="text-xs text-destructive">{errs.stageId}</p>}
            </div>
          )}

          {type === 'ASSEMBLING' && (
            <div className="space-y-1.5">
              <Label>Resource Working for Assembling</Label>
              <Select value={form.assemblingResource} onChange={(v) => setForm({ ...form, assemblingResource: v })} options={users.filter((u) => u.status === 'Active').map((u) => ({ label: u.name, value: u.name }))} placeholder="Select resource" />
            </div>
          )}

          {type === 'MATERIAL' && (
            <>
              <div className="space-y-1.5">
                <Label>Material <span className="text-destructive">*</span></Label>
                <Select value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v })} options={materials.map((m) => ({ label: `${m.name} (${m.code})`, value: m.id }))} error={!!errs.materialId} placeholder="Select material" />
                {form.materialId && <p className="text-[10px] font-mono text-muted-foreground">ID: {form.materialId}</p>}
                {errs.materialId && <p className="text-xs text-destructive">{errs.materialId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Supplier <span className="text-destructive">*</span></Label>
                <Select value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} options={suppliers.map((s) => ({ label: s.name, value: s.id }))} error={!!errs.supplierId} placeholder="Select supplier" />
                {errs.supplierId && <p className="text-xs text-destructive">{errs.supplierId}</p>}
              </div>
            </>
          )}

          {type === 'COMPONENT' && (
            <>
              <div className="space-y-1.5">
                <Label>Component <span className="text-destructive">*</span></Label>
                <Select value={form.componentId} onChange={(v) => setForm({ ...form, componentId: v })} options={availableComponents.map((c) => ({ label: `${c.name} (${c.code})`, value: c.id }))} error={!!errs.componentId} placeholder={form.productId ? 'Select component' : 'Select product first'} disabled={!form.productId} />
                {form.componentId && <p className="text-[10px] font-mono text-muted-foreground">ID: {form.componentId}</p>}
                {errs.componentId && <p className="text-xs text-destructive">{errs.componentId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Material Type</Label>
                <Select value={form.materialType} onChange={(v) => setForm({ ...form, materialType: v })} options={materialTypes.map((t) => ({ label: t.name, value: t.name }))} placeholder="Select type" />
              </div>
            </>
          )}

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label>Parameters <span className="text-destructive">*</span></Label>
              <Button type="button" size="sm" variant="outline" onClick={addParam}><Plus className="h-4 w-4" /> Add Parameter</Button>
            </div>
            {errs.params && <p className="text-xs text-destructive mb-2">{errs.params}</p>}
            <div className="space-y-3">
              {params.map((p, i) => (
                <div key={p.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parameter {i + 1}</p>
                    {params.length > 1 && <button type="button" onClick={() => removeParam(i)} className="text-destructive hover:bg-destructive/10 p-1 rounded"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                  <Textarea placeholder="Description of inspection" value={p.description} onChange={(e) => updateParam(i, { description: e.target.value })} rows={1} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Select value={p.equipmentId} onChange={(v) => updateParam(i, { equipmentId: v })} placeholder="Equipment" error={!!errs[`p${i}_eq`]}
                        options={equipment.map((eq) => ({
                          label: eq.calibrationStatus === 'COMPLETED' ? eq.name : `${eq.name} (Uncalibrated)`,
                          value: eq.id, disabled: eq.calibrationStatus !== 'COMPLETED',
                        }))} />
                      {errs[`p${i}_eq`] && <p className="text-[10px] text-destructive mt-1">{errs[`p${i}_eq`]}</p>}
                    </div>
                    <Input placeholder="Parameter name" value={p.parameterName} error={!!errs[`p${i}_name`]} onChange={(e) => updateParam(i, { parameterName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Unit (e.g. mm)" value={p.unit} error={!!errs[`p${i}_unit`]} onChange={(e) => updateParam(i, { unit: e.target.value })} />
                    <Input type="number" step="any" placeholder="Target value" value={p.targetValue || ''} error={!!errs[`p${i}_tgt`]} onChange={(e) => updateParam(i, { targetValue: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Inspector</Label>
              <Select value={form.inspectorId} onChange={(v) => setForm({ ...form, inspectorId: v })} options={inspectors.map((u) => ({ label: u.name, value: u.id }))} error={!!errs.inspectorId} placeholder="Select inspector" />
              {errs.inspectorId && <p className="text-xs text-destructive">{errs.inspectorId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Inspection Date</Label>
              <Input type="date" value={form.inspectionDate} onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })} />
            </div>
          </div>
        </div>
      </SheetBody>
      <SheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
        <Button variant="outline" onClick={() => save('DRAFT')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save as Draft</Button>
        <Button variant="accent" onClick={() => save('SUBMITTED')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit for QM Review</Button>
      </SheetFooter>
    </Sheet>
  );
};
