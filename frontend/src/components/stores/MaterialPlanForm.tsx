import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { MaterialInspectionParam, MaterialUnit, InspectionMethodType } from '@/types';

const blankParam = (): MaterialInspectionParam => ({ id: `tmp-${Math.random().toString(36).slice(2, 8)}`, parameterName: '', unit: '', targetValue: 0 });

/**
 * The backend InspectionPlan model has no dedicated quantity/unit/method columns for
 * R1_MATERIAL plans — those mock-only fields are folded into the plan's free-text
 * `instructions` field using a small fixed format so they can be parsed back out again
 * when editing. Exported so the list page can render the same values in its table/detail view.
 */
export const buildMaterialInstructions = (opts: { quantity: number; unit: string; method: string; observations?: string }) => {
  const lines = [`Quantity: ${opts.quantity} ${opts.unit}`, `Method: ${opts.method}`];
  if (opts.observations) lines.push(`Observations: ${opts.observations}`);
  return lines.join('\n');
};

export const parseMaterialInstructions = (instructions?: string) => {
  const qtyMatch = instructions?.match(/Quantity:\s*([\d.]+)\s*(\S+)/);
  const methodMatch = instructions?.match(/Method:\s*(\S+)/);
  const obsMatch = instructions?.match(/Observations:\s*([\s\S]*)$/);
  return {
    quantity: qtyMatch ? parseFloat(qtyMatch[1]) : 0,
    unit: qtyMatch ? qtyMatch[2] : 'kg',
    method: (methodMatch ? methodMatch[1] : 'PHYSICAL_TEST') as InspectionMethodType,
    observations: obsMatch ? obsMatch[1].trim() : '',
  };
};

interface Props { open: boolean; onOpenChange: (o: boolean) => void; editing?: any | null; onSaved?: () => void; }

export const MaterialPlanForm = ({ open, onOpenChange, editing, onSaved }: Props) => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inspectionTypes, setInspectionTypes] = useState<any[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    materialId: '', quantity: 0, unit: 'kg' as MaterialUnit, supplierId: '', productId: '', method: 'PHYSICAL_TEST' as InspectionMethodType, observations: '',
  });
  const [params, setParams] = useState<MaterialInspectionParam[]>([blankParam()]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.organization) return;
    const q = `?organization=${user.organization}`;
    api.getList<any>(`/admin/materials${q}`).then(({ data }) => setMaterials(data)).catch(() => {});
    api.getList<any>(`/admin/suppliers${q}`).then(({ data }) => setSuppliers(data)).catch(() => {});
    api.getList<any>(`/admin/products${q}`).then(({ data }) => setProducts(data)).catch(() => {});
    api.getList<any>(`/admin/inspection-types${q}`).then(({ data }) => setInspectionTypes(data)).catch(() => {});
  }, [user?.organization]);

  useEffect(() => {
    if (editing) {
      const parsed = parseMaterialInstructions(editing.instructions);
      setForm({
        date: (editing.dueDate || editing.createdAt || new Date().toISOString()).slice(0, 10),
        materialId: editing.material?._id || editing.material || '',
        quantity: parsed.quantity,
        unit: parsed.unit as MaterialUnit,
        supplierId: editing.supplier?._id || editing.supplier || '',
        productId: editing.product?._id || editing.product || '',
        method: parsed.method,
        observations: parsed.observations,
      });
      setParams(
        editing.checklistTemplate?.length
          ? editing.checklistTemplate.map((c: any, i: number) => ({ id: `chk-${i}`, parameterName: c.parameter, unit: c.unit || '', targetValue: parseFloat(c.specificationValue) || 0 }))
          : [blankParam()]
      );
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

  const save = async (status: 'DRAFT' | 'ACTIVE') => {
    if (!validate()) { toast.error('Please fix the errors'); return; }
    if (!user?.organization) { toast.error('Missing organization context'); return; }
    const inspectionType = inspectionTypes.find((t) => t.category === 'INCOMING_MATERIAL') || inspectionTypes[0];
    if (!inspectionType) { toast.error('No inspection type is configured for incoming material inspections. Ask an admin to create one first.'); return; }
    setBusy(true);
    try {
      const material = materials.find((m) => m._id === form.materialId);
      const supplier = suppliers.find((s) => s._id === form.supplierId);
      const product = products.find((p) => p._id === form.productId);
      const payload: Record<string, any> = {
        organization: user.organization,
        createdBy: user.id,
        planType: 'R1_MATERIAL',
        title: `${material?.name || 'Material'} – Incoming Material Inspection`,
        material: form.materialId,
        supplier: form.supplierId,
        product: form.productId,
        inspectionType: inspectionType._id,
        dueDate: new Date(form.date).toISOString(),
        instructions: buildMaterialInstructions({ quantity: form.quantity, unit: form.unit, method: form.method, observations: form.observations }),
        checklistTemplate: params.map((p, i) => ({
          parameter: p.parameterName,
          specificationValue: String(p.targetValue),
          unit: p.unit,
          mandatory: true,
          sequence: i,
        })),
        status,
      };
      if (editing) {
        await api.put(`/inspection-plans/${editing.id || editing._id}`, payload);
      } else {
        await api.post('/inspection-plans', payload);
      }
      toast.success(editing ? 'Plan updated' : status === 'DRAFT' ? 'Plan saved as draft' : 'Plan submitted');
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={busy ? () => {} : onOpenChange} className="!w-[600px]">
      <SheetHeader>
        <SheetTitle>{editing ? `Edit ${editing.planId || editing.planCode}` : 'Create Material Received Plan'}</SheetTitle>
        <SheetDescription>Define material parameters for incoming inspection.</SheetDescription>
      </SheetHeader>
      <SheetBody>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date</Label><DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></div>
            <div className="space-y-1.5"><Label>Inspection Method</Label>
              <Select value={form.method} onChange={(v) => setForm({ ...form, method: v as InspectionMethodType })}
                options={[{ label: 'Physical Test', value: 'PHYSICAL_TEST' }, { label: 'Analytical Test', value: 'ANALYTICAL_TEST' }, { label: 'Observation', value: 'OBSERVATION' }]} />
            </div>
          </div>
          <div className="space-y-1.5"><Label>Material <span className="text-destructive">*</span></Label>
            <Select value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v })} options={materials.map((m) => ({ label: `${m.name} (${m.materialId})`, value: m._id }))} error={!!errs.materialId} placeholder="Select material" />
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
            <Select value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} options={suppliers.map((s) => ({ label: s.name, value: s._id }))} error={!!errs.supplierId} placeholder="Select supplier" />
            {errs.supplierId && <p className="text-xs text-destructive">{errs.supplierId}</p>}
          </div>
          <div className="space-y-1.5"><Label>Material for Product <span className="text-destructive">*</span></Label>
            <Select value={form.productId} onChange={(v) => setForm({ ...form, productId: v })} options={products.map((p) => ({ label: p.name, value: p._id }))} error={!!errs.productId} placeholder="Select product" />
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
        <Button variant="accent" onClick={() => save('ACTIVE')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit</Button>
      </SheetFooter>
    </Sheet>
  );
};
