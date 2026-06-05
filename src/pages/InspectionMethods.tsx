import { useState } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { InlineEdit } from '@/components/shared/InlineEdit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { Sheet, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { ConfigForm } from '@/components/shared/ConfigForm';
import { inspectionMethodFields } from '@/lib/entityFields';
import { useData } from '@/context/DataContext';
import type { InspectionMethod } from '@/types';

const METHOD_TYPE_LABEL: Record<string, string> = {
  CHEMICAL: 'Chemical / Analytical', PHYSICAL: 'Physical', MICROBIO: 'Microbiological',
  SENSORY: 'Sensory / Visual', NDT: 'Non-Destructive Testing', INSTRUMENTIVE: 'Instrumentive',
};
const APPROVAL_LABEL: Record<string, string> = { DRAFT: 'Draft', REVIEW: 'Under Review', APPROVED: 'Approved' };
const APPROVAL_VARIANT: Record<string, any> = { DRAFT: 'slate', REVIEW: 'warning', APPROVED: 'success' };

const initForm: any = { name: '', code: '', methodType: 'PHYSICAL', referenceStandard: '', description: '', equipmentIds: [], sampleSize: '', acceptanceCriteria: '', approvalStatus: 'DRAFT', approvedById: '', effectiveDate: '', sopFile: '' };

export const InspectionMethodsPage = () => {
  const { inspectionMethods, equipment, users, addInspectionMethod, updateInspectionMethod, deleteInspectionMethod } = useData();
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<InspectionMethod | null>(null);
  const [detail, setDetail] = useState<InspectionMethod | null>(null);
  const [form, setForm] = useState<any>(initForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<InspectionMethod | null>(null);

  const openAdd = () => { setEditing(null); setForm(initForm); setErrs({}); setDrawer(true); };
  const openEdit = (m: InspectionMethod) => { setEditing(m); setForm({ ...initForm, ...m }); setErrs({}); setDrawer(true); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    const { id, isSystem, ...payload } = form;
    const res = editing ? updateInspectionMethod(editing.id, payload) : addInspectionMethod(payload);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(editing ? 'Method updated' : 'Method added');
    setDrawer(false);
  };

  const stop = (node: React.ReactNode) => <span onClick={(e) => e.stopPropagation()}>{node}</span>;

  const columns: Column<InspectionMethod>[] = [
    { key: 'name', header: 'Method', cell: (m) => m.isSystem ? <span className="font-medium">{m.name}</span> : stop(<InlineEdit value={m.name} onSave={(v) => { updateInspectionMethod(m.id, { name: v }); toast.success('Updated'); }} className="font-medium" />) },
    { key: 'type', header: 'Method Type', cell: (m) => m.methodType ? <Badge variant="outline">{METHOD_TYPE_LABEL[m.methodType] || m.methodType}</Badge> : <span className="text-muted-foreground">—</span> },
    { key: 'desc', header: 'Description', cell: (m) => m.isSystem ? <span className="text-muted-foreground text-sm line-clamp-1">{m.description}</span> : stop(<InlineEdit value={m.description} onSave={(v) => { updateInspectionMethod(m.id, { description: v }); toast.success('Updated'); }} className="text-muted-foreground" />) },
    { key: 'approval', header: 'Approval', cell: (m) => m.approvalStatus ? <Badge variant={APPROVAL_VARIANT[m.approvalStatus] || 'slate'}>{APPROVAL_LABEL[m.approvalStatus] || m.approvalStatus}</Badge> : <span className="text-muted-foreground">—</span> },
    { key: 'origin', header: 'Origin', cell: (m) => m.isSystem ? <Badge variant="slate">System</Badge> : <Badge variant="accent">Custom</Badge> },
    { key: 'actions', header: '', width: 'w-12', cell: (m) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => setDetail(m)}><Eye className="h-4 w-4" /> View Details</DropdownItem>
          {!m.isSystem && <DropdownItem onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>}
          {!m.isSystem && <DropdownItem danger onClick={() => setConfirmDel(m)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>}
          {m.isSystem && <DropdownItem disabled>System method</DropdownItem>}
        </Dropdown>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Inspection Methods"
        description="System and custom inspection methodologies."
        action={<Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Custom Method</Button>}
      />
      <DataTable columns={columns} data={inspectionMethods} onRowClick={(m) => setDetail(m)} emptyTitle="No methods" />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        {detail && (() => {
          const equip = (detail.equipmentIds || []).map((id) => equipment.find((e) => e.id === id)?.name).filter(Boolean);
          const approver = users.find((u) => u.id === detail.approvedById)?.name;
          const rows: [string, any][] = [
            ['Method Code', detail.code || '—'],
            ['Method Type', detail.methodType ? (METHOD_TYPE_LABEL[detail.methodType] || detail.methodType) : '—'],
            ['Reference Standard', detail.referenceStandard || '—'],
            ['Sample Size', detail.sampleSize || '—'],
            ['Approval Status', detail.approvalStatus ? (APPROVAL_LABEL[detail.approvalStatus] || detail.approvalStatus) : '—'],
            ['Approved By', approver || '—'],
            ['Effective Date', detail.effectiveDate || '—'],
            ['Origin', detail.isSystem ? 'System' : 'Custom'],
          ];
          return (
            <>
              <SheetHeader><SheetTitle>{detail.name}</SheetTitle></SheetHeader>
              <SheetBody>
                {detail.description && <p className="text-sm text-muted-foreground mb-5">{detail.description}</p>}
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {rows.map(([k, v]) => (
                    <div key={k}><dt className="text-xs text-muted-foreground uppercase tracking-wider">{k}</dt><dd className="mt-1">{v}</dd></div>
                  ))}
                </dl>
                {equip.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Equipment Required</dt>
                    <div className="flex flex-wrap gap-1.5">{equip.map((e) => <Badge key={e as string} variant="outline">{e}</Badge>)}</div>
                  </div>
                )}
                {detail.acceptanceCriteria && <div className="mt-4 pt-4 border-t"><dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Acceptance Criteria</dt><dd className="text-sm">{detail.acceptanceCriteria}</dd></div>}
                {!detail.isSystem && (
                  <div className="mt-6 pt-6 border-t flex gap-2">
                    <Button variant="outline" onClick={() => { setDetail(null); openEdit(detail); }}><Pencil className="h-4 w-4" /> Edit Method</Button>
                  </div>
                )}
              </SheetBody>
            </>
          );
        })()}
      </Sheet>

      <FormDrawer open={drawer} onOpenChange={setDrawer} title={editing ? 'Edit Method' : 'Add Custom Method'} onSubmit={submit} submitLabel={editing ? 'Update' : 'Add'}>
        <ConfigForm fields={inspectionMethodFields(equipment, users)} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={() => { if (confirmDel) { const r = deleteInspectionMethod(confirmDel.id); if (r.success) { toast.success('Deleted'); setConfirmDel(null); } else toast.error(r.error); } }} />
    </PageWrapper>
  );
};
