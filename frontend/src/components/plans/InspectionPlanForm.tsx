import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PlanType } from '@/types';

interface InspectionPlanFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: PlanType;
  editing?: any | null;
}

const TYPE_MAP: Record<PlanType, string> = {
  MANUFACTURING: 'R3_MANUFACTURING',
  ASSEMBLING: 'R4_ASSEMBLY',
  MATERIAL: 'R1_MATERIAL',
  COMPONENT: 'R2_COMPONENT',
};

// The backend requires every InspectionPlan to reference an InspectionType, which the
// mock form never captured. We auto-pick the best-matching one from the org's configured
// inspection types by category, falling back to whatever exists — mirrors the convention
// already used by the sibling MaterialPlanForm (stores-manager module).
const CATEGORY_MAP: Record<PlanType, string> = {
  MANUFACTURING: 'IN_PROCESS',
  ASSEMBLING: 'IN_PROCESS',
  MATERIAL: 'INCOMING_MATERIAL',
  COMPONENT: 'COMPONENT',
};

// A ref field may come back either populated (an object with _id/name) or as a raw
// ObjectId string, depending on which fields the source endpoint chose to populate.
const idOf = (v: any): string => (v && typeof v === 'object' ? v._id : v) || '';

// `materialType` (component plans) and `assemblingResource` (assembling plans) have no
// dedicated column on the backend InspectionPlan model, so they're folded into the plan's
// free-text `instructions` field as "Key: value" lines and parsed back out here on edit.
const parseInstructionField = (instructions: string | undefined, key: string): string => {
  if (!instructions) return '';
  const m = instructions.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim() : '';
};

interface FormParam {
  id: string;
  equipmentId: string;
  parameterName: string;
  unit: string;
  targetValue: number;
}

const blankParam = (): FormParam => ({
  id: `tmp-${Math.random().toString(36).slice(2, 8)}`,
  equipmentId: '', parameterName: '', unit: '', targetValue: 0,
});

export const InspectionPlanForm = ({ open, onOpenChange, type, editing }: InspectionPlanFormProps) => {
  const { user } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialTypes, setMaterialTypes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [inspectionTypes, setInspectionTypes] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !user?.organization) return;
    const org = user.organization;
    api.getList<any>(`/admin/products?organization=${org}&limit=500`).then(({ data }) => setProducts(data)).catch(() => {});
    api.getList<any>(`/admin/materials?organization=${org}`).then(({ data }) => setMaterials(data)).catch(() => {});
    api.getList<any>(`/admin/material-types?organization=${org}`).then(({ data }) => setMaterialTypes(data)).catch(() => {});
    api.getList<any>(`/admin/suppliers?organization=${org}&limit=500`).then(({ data }) => setSuppliers(data)).catch(() => {});
    api.getList<any>(`/admin/equipment?organization=${org}`).then(({ data }) => setEquipment(data)).catch(() => {});
    api.getList<any>(`/admin/inspection-types?organization=${org}`).then(({ data }) => setInspectionTypes(data)).catch(() => {});
    api.getList<any>(`/admin/users?organization=${org}&role=Inspector&isActive=true&limit=500`).then(({ data }) => setInspectors(data)).catch(() => {});
  }, [open, user?.organization]);

  const [form, setForm] = useState({
    productId: '', stageId: '', componentId: '', materialId: '', supplierId: '', materialType: '',
    assemblingResource: '', inspectorId: '', inspectionDate: new Date().toISOString().slice(0, 10),
  });
  const [params, setParams] = useState<FormParam[]>([blankParam()]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        productId: idOf(editing.product),
        stageId: idOf(type === 'MANUFACTURING' ? editing.manufacturingStage : editing.assemblyStage),
        componentId: idOf(editing.component),
        materialId: idOf(editing.material),
        supplierId: idOf(editing.supplier),
        materialType: parseInstructionField(editing.instructions, 'Material Type'),
        assemblingResource: parseInstructionField(editing.instructions, 'Assembling Resource'),
        inspectorId: idOf(editing.assignedInspectors?.[0]),
        inspectionDate: (editing.dueDate || new Date().toISOString()).slice(0, 10),
      });
      setParams(
        editing.checklistTemplate?.length
          ? editing.checklistTemplate.map((c: any, i: number) => ({
              id: `chk-${i}`,
              equipmentId: idOf(c.equipment),
              parameterName: c.parameter,
              unit: c.unit || '',
              targetValue: parseFloat(c.specificationValue) || 0,
            }))
          : [blankParam()]
      );
    } else {
      setForm({ productId: '', stageId: '', componentId: '', materialId: '', supplierId: '', materialType: '', assemblingResource: '', inspectorId: '', inspectionDate: new Date().toISOString().slice(0, 10) });
      setParams([blankParam()]);
    }
    setErrs({});
  }, [editing, open, type]);

  // Product list is populated with its full manufacturingStages/assemblyStages/components
  // sub-documents by the admin API, so the options for a chosen product come straight off it.
  const product = products.find((p) => p._id === form.productId);
  const availableStages: any[] = (() => {
    if (!product) return [];
    if (type === 'MANUFACTURING') return product.manufacturingStages || [];
    if (type === 'ASSEMBLING') return product.assemblyStages || [];
    return [];
  })();
  const availableComponents: any[] = product?.components || [];

  const updateParam = (i: number, patch: Partial<FormParam>) =>
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
      const eq = equipment.find((x) => x._id === p.equipmentId);
      if (eq && eq.calibrationStatus !== 'COMPLETED') e[`p${i}_eq`] = 'Equipment uncalibrated';
    });
    if (isSubmit && !form.inspectorId) e.inspectorId = 'Required to submit';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const save = async (isSubmit: boolean) => {
    if (!validate(isSubmit)) { toast.error('Please fix the form errors'); return; }
    if (!user?.organization) { toast.error('Missing organization context'); return; }

    const inspectionType = inspectionTypes.find((t) => t.category === CATEGORY_MAP[type]) || inspectionTypes[0];
    if (!inspectionType) {
      toast.error('No inspection type is configured for this plan type. Ask an admin to create one first.');
      return;
    }

    setBusy(true);
    try {
      const stage = availableStages.find((s) => s._id === form.stageId);
      const comp = availableComponents.find((c) => c._id === form.componentId);
      const mat = materials.find((m) => m._id === form.materialId);
      const targetName = stage?.name || comp?.name || mat?.name;

      const instructionLines: string[] = [];
      if (type === 'COMPONENT' && form.materialType) instructionLines.push(`Material Type: ${form.materialType}`);
      if (type === 'ASSEMBLING' && form.assemblingResource) instructionLines.push(`Assembling Resource: ${form.assemblingResource}`);

      const payload: Record<string, any> = {
        organization: user.organization,
        createdBy: user.id,
        planType: TYPE_MAP[type],
        title: `${product?.name || 'Product'}${targetName ? ' – ' + targetName : ''} Inspection Plan`,
        product: form.productId,
        inspectionType: inspectionType._id,
        checklistTemplate: params.map((p, i) => ({
          parameter: p.parameterName,
          specificationValue: String(p.targetValue),
          unit: p.unit,
          equipment: p.equipmentId || undefined,
          mandatory: true,
          sequence: i,
        })),
        assignedInspectors: form.inspectorId ? [form.inspectorId] : [],
        dueDate: new Date(form.inspectionDate).toISOString(),
        status: isSubmit ? 'ACTIVE' : 'DRAFT',
        ...(instructionLines.length ? { instructions: instructionLines.join('\n') } : {}),
      };

      if (type === 'MANUFACTURING') payload.manufacturingStage = form.stageId;
      if (type === 'ASSEMBLING') payload.assemblyStage = form.stageId;
      if (type === 'COMPONENT') payload.component = form.componentId;
      if (type === 'MATERIAL') { payload.material = form.materialId; payload.supplier = form.supplierId; }

      if (editing) {
        await api.put(`/inspection-plans/${editing.id || editing._id}`, payload);
      } else {
        await api.post('/inspection-plans', payload);
      }
      toast.success(editing ? 'Plan updated' : isSubmit ? 'Plan submitted for review' : 'Plan saved as draft');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const typeLabel = type === 'MANUFACTURING' ? 'Manufacturing' : type === 'ASSEMBLING' ? 'Assembling' : type === 'MATERIAL' ? 'Material' : 'Component';

  return (
    <Sheet open={open} onOpenChange={busy ? () => {} : onOpenChange} className="!w-[640px]">
      <SheetHeader>
        <SheetTitle>{editing ? `Edit ${editing.planId}` : `Create ${typeLabel} Inspection Plan`}</SheetTitle>
        <SheetDescription>Define inspection parameters, equipment and inspector.</SheetDescription>
      </SheetHeader>
      <SheetBody>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product <span className="text-destructive">*</span></Label>
            <Select value={form.productId} onChange={(v) => setForm({ ...form, productId: v, stageId: '', componentId: '' })} options={products.map((p) => ({ label: `${p.name} (${p.productId})`, value: p._id }))} error={!!errs.productId} placeholder="Select product" />
            {errs.productId && <p className="text-xs text-destructive">{errs.productId}</p>}
          </div>

          {(type === 'MANUFACTURING' || type === 'ASSEMBLING') && (
            <div className="space-y-1.5">
              <Label>{type === 'MANUFACTURING' ? 'Manufacturing' : 'Assembling'} Stage <span className="text-destructive">*</span></Label>
              <Select value={form.stageId} onChange={(v) => setForm({ ...form, stageId: v })} options={availableStages.map((s) => ({ label: s.name, value: s._id }))} error={!!errs.stageId} placeholder={form.productId ? 'Select stage' : 'Select product first'} disabled={!form.productId} />
              {errs.stageId && <p className="text-xs text-destructive">{errs.stageId}</p>}
            </div>
          )}

          {type === 'ASSEMBLING' && (
            <div className="space-y-1.5">
              <Label>Resource Working for Assembling</Label>
              <Input placeholder="e.g. operator or team name" value={form.assemblingResource} onChange={(e) => setForm({ ...form, assemblingResource: e.target.value })} />
            </div>
          )}

          {type === 'MATERIAL' && (
            <>
              <div className="space-y-1.5">
                <Label>Material <span className="text-destructive">*</span></Label>
                <Select value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v })} options={materials.map((m) => ({ label: `${m.name} (${m.materialId})`, value: m._id }))} error={!!errs.materialId} placeholder="Select material" />
                {errs.materialId && <p className="text-xs text-destructive">{errs.materialId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Supplier <span className="text-destructive">*</span></Label>
                <Select value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} options={suppliers.map((s) => ({ label: s.name, value: s._id }))} error={!!errs.supplierId} placeholder="Select supplier" />
                {errs.supplierId && <p className="text-xs text-destructive">{errs.supplierId}</p>}
              </div>
            </>
          )}

          {type === 'COMPONENT' && (
            <>
              <div className="space-y-1.5">
                <Label>Component <span className="text-destructive">*</span></Label>
                <Select value={form.componentId} onChange={(v) => setForm({ ...form, componentId: v })} options={availableComponents.map((c) => ({ label: `${c.name} (${c.componentId})`, value: c._id }))} error={!!errs.componentId} placeholder={form.productId ? 'Select component' : 'Select product first'} disabled={!form.productId} />
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
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Select value={p.equipmentId} onChange={(v) => updateParam(i, { equipmentId: v })} placeholder="Equipment" error={!!errs[`p${i}_eq`]}
                        options={equipment.map((eq) => ({
                          label: eq.calibrationStatus === 'COMPLETED' ? eq.name : `${eq.name} (Uncalibrated)`,
                          value: eq._id, disabled: eq.calibrationStatus !== 'COMPLETED',
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
              <Select value={form.inspectorId} onChange={(v) => setForm({ ...form, inspectorId: v })} options={inspectors.map((u) => ({ label: u.name, value: u._id }))} error={!!errs.inspectorId} placeholder="Select inspector" />
              {errs.inspectorId && <p className="text-xs text-destructive">{errs.inspectorId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Inspection Date</Label>
              <DatePicker value={form.inspectionDate} onChange={(v) => setForm({ ...form, inspectionDate: v })} />
            </div>
          </div>
        </div>
      </SheetBody>
      <SheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
        <Button variant="outline" onClick={() => save(false)} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save as Draft</Button>
        <Button variant="accent" onClick={() => save(true)} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit for QM Review</Button>
      </SheetFooter>
    </Sheet>
  );
};
