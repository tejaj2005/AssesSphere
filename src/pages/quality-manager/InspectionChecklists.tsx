import { useMemo, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Trash2, Pencil, MoreHorizontal, Eye, FileEdit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { cn, formatDate } from '@/lib/utils';

type PlanTab = 'R3_MANUFACTURING' | 'R4_ASSEMBLY' | 'R5_FINAL';

interface ChecklistItemView {
  parameter: string;
  specificationValue: string;
  toleranceMin: string;
  toleranceMax: string;
  unit: string;
  mandatory: boolean;
  inspectionMethod?: string;
  equipment?: string;
}

/** InspectionPlan (mock's "InspectionChecklist" has no backend model of its own — a checklist
 * only exists inline as a plan's `checklistTemplate` array). This view flattens the raw API doc
 * into the shape this page renders. */
interface PlanView {
  id: string;
  planId: string;
  planType: string;
  title: string;
  productName: string;
  status: string;
  checklistTemplate: ChecklistItemView[];
  createdAt: string;
}

interface EditRow extends ChecklistItemView {
  key: string;
}

const genKey = () => `row-${Math.random().toString(36).slice(2, 9)}`;
const refId = (v: any): string | undefined => (v && typeof v === 'object' ? v._id : v) || undefined;

const toPlanView = (raw: any): PlanView => ({
  id: raw._id || raw.id,
  planId: raw.planId || '',
  planType: raw.planType,
  title: raw.title || '',
  productName: typeof raw.product === 'object' && raw.product ? raw.product.name : '',
  status: raw.status,
  createdAt: raw.createdAt,
  checklistTemplate: (raw.checklistTemplate || []).map((it: any) => ({
    parameter: it.parameter || '',
    specificationValue: it.specificationValue || '',
    toleranceMin: it.toleranceMin || '',
    toleranceMax: it.toleranceMax || '',
    unit: it.unit || '',
    mandatory: it.mandatory ?? true,
    inspectionMethod: refId(it.inspectionMethod),
    equipment: refId(it.equipment),
  })),
});

const statusVariant = (s: string) =>
  s === 'COMPLETED' ? 'success' : s === 'ACTIVE' ? 'accent' : s === 'ON_HOLD' ? 'warning' : s === 'CANCELLED' ? 'danger' : 'slate';

const SortableRow = ({ row, index, onChange, onRemove }: { row: EditRow; index: number; onChange: (patch: Partial<EditRow>) => void; onRemove: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={cn('rounded-md border bg-card p-3 space-y-2', isDragging && 'shadow-lg')}>
      <div className="flex items-center justify-between">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground p-1 flex items-center gap-1 text-xs">
          <GripVertical className="h-3.5 w-3.5" /> Item {index + 1}
        </button>
        <button onClick={onRemove} className="text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Parameter" value={row.parameter} onChange={(e) => onChange({ parameter: e.target.value })} />
        <Input placeholder="Specification value" value={row.specificationValue} onChange={(e) => onChange({ specificationValue: e.target.value })} />
        <Input placeholder="Tolerance min" value={row.toleranceMin} onChange={(e) => onChange({ toleranceMin: e.target.value })} />
        <Input placeholder="Tolerance max" value={row.toleranceMax} onChange={(e) => onChange({ toleranceMax: e.target.value })} />
        <Input placeholder="Unit" value={row.unit} onChange={(e) => onChange({ unit: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={row.mandatory} onCheckedChange={(c) => onChange({ mandatory: c })} /> Mandatory
        </label>
      </div>
    </div>
  );
};

export const InspectionChecklists = () => {
  const { user } = useAuth();
  const { items: rawPlans, loading, update, remove } = useApiResource<any>(
    '/inspection-plans',
    user?.organization ? { organization: user.organization } : undefined
  );

  const plans = useMemo(() => rawPlans.map(toPlanView), [rawPlans]);

  const [tab, setTab] = useState<PlanTab>('R3_MANUFACTURING');
  const [detail, setDetail] = useState<PlanView | null>(null);
  const [editing, setEditing] = useState<PlanView | null>(null);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [confirmDel, setConfirmDel] = useState<PlanView | null>(null);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => plans.filter((p) => p.planType === tab), [plans, tab]);
  const count = (t: PlanTab) => plans.filter((p) => p.planType === t).length;

  const openEdit = (p: PlanView) => {
    setDetail(null);
    setEditing(p);
    setRows(p.checklistTemplate.map((it) => ({ ...it, key: genKey() })));
  };

  const handleDrag = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = rows.findIndex((r) => r.key === active.id);
    const newIdx = rows.findIndex((r) => r.key === over.id);
    setRows(arrayMove(rows, oldIdx, newIdx));
  };

  const saveChecklist = async () => {
    if (!editing) return;
    const valid = rows.filter((r) => r.parameter.trim() && r.specificationValue.trim());
    if (!valid.length) { toast.error('Add at least 1 item with a parameter and specification value'); return; }
    setBusy(true);
    try {
      const checklistTemplate = valid.map((r, idx) => ({
        parameter: r.parameter.trim(),
        specificationValue: r.specificationValue.trim(),
        toleranceMin: r.toleranceMin.trim() || undefined,
        toleranceMax: r.toleranceMax.trim() || undefined,
        unit: r.unit.trim() || undefined,
        mandatory: r.mandatory,
        sequence: idx,
        inspectionMethod: r.inspectionMethod,
        equipment: r.equipment,
      }));
      await update(editing.id, { checklistTemplate });
      toast.success('Checklist updated');
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const exportRows = filtered.map((p) => ({
    Plan: p.planId, Title: p.title, Product: p.productName, Items: p.checklistTemplate.length,
    Mandatory: p.checklistTemplate.filter((i) => i.mandatory).length, Status: p.status, Created: formatDate(p.createdAt),
  }));

  const columns: Column<PlanView>[] = [
    { key: 'code', header: 'Plan', cell: (p) => <span className="font-mono text-xs font-medium">{p.planId}</span> },
    { key: 'title', header: 'Title / Product', cell: (p) => (
      <div><p className="font-medium text-sm">{p.title}</p><p className="text-xs text-muted-foreground">{p.productName}</p></div>
    ) },
    { key: 'items', header: 'Items', cell: (p) => <Badge variant="outline">{p.checklistTemplate.length}</Badge> },
    { key: 'mandatory', header: 'Mandatory', cell: (p) => <span className="text-xs font-medium">{p.checklistTemplate.filter((i) => i.mandatory).length}</span> },
    { key: 'status', header: 'Status', cell: (p) => <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge> },
    { key: 'actions', header: '', width: 'w-12', cell: (p) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => setDetail(p)}><Eye className="h-4 w-4" /> View</DropdownItem>
          <DropdownItem onClick={() => openEdit(p)}><FileEdit className="h-4 w-4" /> Edit Checklist</DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onClick={() => setConfirmDel(p)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
        </Dropdown>
      </div>
    ) },
  ];

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader
        title="Inspection Checklists"
        description="View and edit the checklist template carried on each inspection plan."
        action={<ExportButtons data={exportRows} fileName="checklists" />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as PlanTab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="R3_MANUFACTURING">Manufacturing ({count('R3_MANUFACTURING')})</TabsTrigger>
          <TabsTrigger value="R4_ASSEMBLY">Assembling ({count('R4_ASSEMBLY')})</TabsTrigger>
          <TabsTrigger value="R5_FINAL">Final Product ({count('R5_FINAL')})</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable columns={columns} data={filtered} onRowClick={(p) => setDetail(p)} emptyTitle="No inspection plans" />

      {/* View */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[560px]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.planId}</SheetTitle>
              <SheetDescription>{detail.title} · {detail.productName} · {detail.checklistTemplate.length} items · {detail.status}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <ol className="space-y-2">
                {detail.checklistTemplate.map((it, idx) => (
                  <li key={idx} className="p-3 rounded-lg border flex items-start gap-3">
                    <span className="text-xs font-mono text-muted-foreground mt-0.5">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{it.parameter}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Spec: {it.specificationValue}{it.unit ? ` ${it.unit}` : ''}
                        {(it.toleranceMin || it.toleranceMax) ? ` · Tol: ${it.toleranceMin || '—'} to ${it.toleranceMax || '—'}` : ''}
                      </p>
                    </div>
                    <Badge variant={it.mandatory ? 'accent' : 'slate'}>{it.mandatory ? 'Mandatory' : 'Optional'}</Badge>
                  </li>
                ))}
                {!detail.checklistTemplate.length && <p className="text-sm text-muted-foreground">No checklist items yet.</p>}
              </ol>
            </SheetBody>
            <SheetFooter>
              <Button variant="accent" onClick={() => openEdit(detail)}><Pencil className="h-4 w-4" /> Edit Checklist</Button>
            </SheetFooter>
          </>
        )}
      </Sheet>

      {/* Edit */}
      <Sheet open={!!editing} onOpenChange={busy ? () => {} : (o) => !o && setEditing(null)} className="!w-[620px]">
        {editing && (
          <>
            <SheetHeader>
              <SheetTitle>Edit Checklist — {editing.planId}</SheetTitle>
              <SheetDescription>{editing.title} · {editing.productName}. Add, remove or reorder items. Min 1 item.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Checklist Items</Label>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => setRows([...rows, { key: genKey(), parameter: '', specificationValue: '', toleranceMin: '', toleranceMax: '', unit: '', mandatory: true }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </Button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDrag}>
                  <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {rows.map((r, idx) => (
                        <SortableRow
                          key={r.key} row={r} index={idx}
                          onChange={(patch) => setRows(rows.map((x) => (x.key === r.key ? { ...x, ...patch } : x)))}
                          onRemove={() => setRows(rows.filter((x) => x.key !== r.key))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </SheetBody>
            <SheetFooter>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button variant="accent" onClick={saveChecklist} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Checklist</Button>
            </SheetFooter>
          </>
        )}
      </Sheet>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Cancel inspection plan?"
        description="This marks the plan CANCELLED; it will no longer appear as an active checklist. This action cannot be undone."
        entityName={confirmDel?.planId}
        confirmLabel="Cancel Plan"
        onConfirm={async () => {
          if (!confirmDel) return;
          await remove(confirmDel.id);
          toast.success('Plan cancelled');
        }}
      />
    </PageWrapper>
  );
};
