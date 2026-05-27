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
import type { MaterialReceivedPlan, MaterialInspectionParam, MaterialUnit, InspectionMethodType, MaterialPlanStatus } from '@/types';

const blankParam = (): MaterialInspectionParam => ({ id: `tmp-${Math.random().toString(36).slice(2, 8)}`, parameterName: '', unit: '', targetValue: 0 });

interface Props { open: boolean; onOpenChange: (o: boolean) => void; editing?: MaterialReceivedPlan | null; }

export const MaterialPlanForm = ({ open, onOpenChange, editing }: Props) => {
  const { materials, suppliers, products, addMaterialPlan, updateMaterialPlan } = useData();
  const { user } = useAuth();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    materialId: '', quantity: 0, unit: 'kg' as MaterialUnit, supplierId: '', productId: '', method: 'PHYSICAL_TEST' as InspectionMethodType, observations: '',
  });
  const [params, setParams] = useState<MaterialInspectionParam[]>([blankParam()]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({ date: editing.date.slice(0, 10), materialId: editing.materialId, quantity: editing.quantity, unit: editing.unit, supplierId: editing.supplierId, productId: editing.productId, method: editing.method, observations: editing.observations || '' });
      setParams(editing.parameters.length ? editing.parameters : [blankParam()]);
    } else {
      setForm({ date: new Date().toISOString().slice(0, 10), materialId: '', quantity: 0, unit: 'kg', supplierId: '', productId: '', method: 'PHYSICAL_TEST', observations: '' });
      setParams([blankParam()]);
    }
    setErrs({});
  }, [editing, open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.materialId) e.materialId = 'Required';
    if (!form.quantity) e.quantity = 'Required';
    if (!form.supplierId) e.supplierId = 'Required';
    if (!form.productId) e.productId = 'Required';
    if (params.length === 0) e.params = 'Min 1 parameter';
    params.forEach((p, i) => {
      if (!p.parameterName.trim()) e[`p${i}n`] = 'Required';
      if (!p.unit.trim()) e[`p${i}u`] = 'Required';
      if (p.targetValue == null || isNaN(p.targetValue as any)) e[`p${i}t`] = 'Required';
    });
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const save = async (status: MaterialPlanStatus) => {
    if (!validate()) { toast.error('Please fix the errors'); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    const material = materials.find((m) => m.id === form.materialId)!;
    const supplier = suppliers.find((s) => s.id === form.supplierId)!;
    const product = products.find((p) => p.id === form.productId)!;
    const payload = {
      date: new Date(form.date).toISOString(),
      materialId: material.id, materialName: material.name, quantity: form.quantity, unit: form.unit,
      supplierId: supplier.id, supplierName: supplier.name, productId: product.id, productName: product.name,
      method: form.method, parameters: params, observations: form.observations,
      overallStatus: status, reviewStatus: status === 'DRAFT' ? 'PENDING' as const : 'PENDING' as const,
      createdBy: user?.name || 'Stores Manager',
    };
    const res = editing ? updateMaterialPlan(editing.id, payload) : addMaterialPlan(payload);
    setBusy(false);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(editing ? 'Plan updated' : status === 'DRAFT' ? 'Plan saved as draft' : 'Plan submitted');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={busy ? () => {} : onOpenChange} className="!w-[600px]">
      <SheetHeader>
        <SheetTitle>{editing ? `Edit ${editing.planCode}` : 'Create Material Received Plan'}</SheetTitle>
        <SheetDescription>Define material parameters for incoming inspection.</SheetDescription>
      </SheetHeader>
      <SheetBody>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Inspection Method</Label>
              <Select value={form.method} onChange={(v) => setForm({ ...form, method: v as InspectionMethodType })}
                options={[{ label: 'Physical Test', value: 'PHYSICAL_TEST' }, { label: 'Analytical Test', value: 'ANALYTICAL_TEST' }, { label: 'Observation', value: 'OBSERVATION' }]} />
            </div>
          </div>
          <div className="space-y-1.5"><Label>Material <span className="text-destructive">*</span></Label>
            <Select value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v })} options={materials.map((m) => ({ label: `${m.name} (${m.code})`, value: m.id }))} error={!!errs.materialId} placeholder="Select material" />
            {form.materialId && <p className="text-[10px] font-mono text-muted-foreground">ID: {form.materialId}</p>}
            {errs.materialId && <p className="text-xs text-destructive">{errs.materialId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Quantity <span className="text-destructive">*</span></Label>
              <Input type="number" value={form.quantity || ''} error={!!errs.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5"><Label>Unit</Label>
              <Select value={form.unit} onChange={(v) => setForm({ ...form, unit: v as MaterialUnit })} options={[{ label: 'kg', value: 'kg' }, { label: 'pcs', value: 'pcs' }, { label: 'liters', value: 'liters' }, { label: 'meters', value: 'meters' }]} />
            </div>
          </div>
          <div className="space-y-1.5"><Label>Supplier <span className="text-destructive">*</span></Label>
            <Select value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} options={suppliers.map((s) => ({ label: s.name, value: s.id }))} error={!!errs.supplierId} placeholder="Select supplier" />
            {errs.supplierId && <p className="text-xs text-destructive">{errs.supplierId}</p>}
          </div>
          <div className="space-y-1.5"><Label>Material for Product <span className="text-destructive">*</span></Label>
            <Select value={form.productId} onChange={(v) => setForm({ ...form, productId: v })} options={products.map((p) => ({ label: p.name, value: p.id }))} error={!!errs.productId} placeholder="Select product" />
            {errs.productId && <p className="text-xs text-destructive">{errs.productId}</p>}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label>Parameters <span className="text-destructive">*</span></Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setParams((p) => [...p, blankParam()])}><Plus className="h-3.5 w-3.5" /> Add</Button>
            </div>
            <div className="space-y-2">
              {params.map((p, i) => (
                <div key={p.id} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parameter {i + 1}</p>
                    {params.length > 1 && <button type="button" onClick={() => setParams((p) => p.filter((_, ix) => ix !== i))} className="text-destructive p-1"><Trash2 className="h-3 w-3" /></button>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="Parameter name" value={p.parameterName} error={!!errs[`p${i}n`]} onChange={(e) => setParams((arr) => arr.map((x, ix) => ix === i ? { ...x, parameterName: e.target.value } : x))} />
                    <Input placeholder="Unit" value={p.unit} error={!!errs[`p${i}u`]} onChange={(e) => setParams((arr) => arr.map((x, ix) => ix === i ? { ...x, unit: e.target.value } : x))} />
                    <Input type="number" step="any" placeholder="Target" value={p.targetValue || ''} error={!!errs[`p${i}t`]} onChange={(e) => setParams((arr) => arr.map((x, ix) => ix === i ? { ...x, targetValue: parseFloat(e.target.value) || 0 } : x))} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5"><Label>Observations</Label>
            <Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={2} placeholder="Optional notes" />
          </div>
        </div>
      </SheetBody>
      <SheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
        <Button variant="outline" onClick={() => save('DRAFT')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Draft</Button>
        <Button variant="accent" onClick={() => save('SUBMITTED')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit</Button>
      </SheetFooter>
    </Sheet>
  );
};
