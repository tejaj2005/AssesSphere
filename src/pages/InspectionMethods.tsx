import { useEffect, useState } from 'react';
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
import { useApiResource } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/** Backend shape (server/models/InspectionMethod.ts) — no `isSystem` flag, and
 * `equipmentRequired` is a free-text string[] (not a ref array), unlike the old mock. */
interface IInspectionMethod {
  _id: string;
  name: string;
  methodId?: string;
  description?: string;
  equipmentRequired?: string[];
  organization?: string;
  methodType?: string;
  referenceStandard?: string;
  sampleSize?: string;
  acceptanceCriteria?: string;
  approvalStatus?: string;
  sopFile?: string;
  [key: string]: any;
}

const METHOD_TYPE_LABEL: Record<string, string> = {
  CHEMICAL: 'Chemical / Analytical', PHYSICAL: 'Physical', MICROBIO: 'Microbiological',
  SENSORY: 'Sensory / Visual', NDT: 'Non-Destructive Testing', INSTRUMENTIVE: 'Instrumentive',
};
const APPROVAL_LABEL: Record<string, string> = { DRAFT: 'Draft', REVIEW: 'Under Review', APPROVED: 'Approved' };
const APPROVAL_VARIANT: Record<string, any> = { DRAFT: 'slate', REVIEW: 'warning', APPROVED: 'success' };

const initForm: any = { name: '', code: '', methodType: 'PHYSICAL', referenceStandard: '', description: '', equipmentIds: [], sampleSize: '', acceptanceCriteria: '', approvalStatus: 'DRAFT', approvedById: '', effectiveDate: '', sopFile: '' };

export const InspectionMethodsPage = () => {
  const { user } = useAuth();
  const { items: inspectionMethods, loading, create, update, remove } = useApiResource<IInspectionMethod>('/admin/inspection-methods');
  const [equipment, setEquipment] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<IInspectionMethod | null>(null);
  const [detail, setDetail] = useState<IInspectionMethod | null>(null);
  const [form, setForm] = useState<any>(initForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<IInspectionMethod | null>(null);

  useEffect(() => {
    api.getList<any>('/admin/equipment').then(({ data }) => setEquipment(data.map((e: any) => ({ id: e._id, name: e.name })))).catch(() => setEquipment([]));
    api.getList<any>('/admin/users').then(({ data }) => setUsers(data.map((u: any) => ({ id: u._id, name: u.name })))).catch(() => setUsers([]));
  }, []);

  const openAdd = () => { setEditing(null); setForm(initForm); setErrs({}); setDrawer(true); };
  const openEdit = (m: IInspectionMethod) => {
    setEditing(m);
    setForm({
      ...initForm,
      name: m.name,
      code: m.methodId || '',
      methodType: m.methodType || 'PHYSICAL',
      referenceStandard: m.referenceStandard || '',
      description: m.description || '',
      // Equipment is stored server-side as free-text names; map back to ids for the multi-select.
      equipmentIds: (m.equipmentRequired || []).map((name) => equipment.find((e) => e.name === name)?.id).filter(Boolean),
      sampleSize: m.sampleSize || '',
      acceptanceCriteria: m.acceptanceCriteria || '',
      approvalStatus: m.approvalStatus || 'DRAFT',
      sopFile: m.sopFile || '',
    });
    setErrs({});
    setDrawer(true);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    const payload: any = {
      name: form.name,
      methodId: form.code || undefined,
      description: form.description,
      methodType: form.methodType,
      referenceStandard: form.referenceStandard,
      equipmentRequired: (form.equipmentIds || []).map((id: string) => equipment.find((e) => e.id === id)?.name).filter(Boolean),
      sampleSize: form.sampleSize,
      acceptanceCriteria: form.acceptanceCriteria,
      approvalStatus: form.approvalStatus,
      sopFile: form.sopFile,
      organization: user?.organization,
    };
    try {
      if (editing) await update(editing._id, payload);
      else await create(payload);
      toast.success(editing ? 'Method updated' : 'Method added');
      setDrawer(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const inlineUpdate = async (id: string, patch: Partial<IInspectionMethod>) => {
    try {
      await update(id, patch);
      toast.success('Updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const stop = (node: React.ReactNode) => <span onClick={(e) => e.stopPropagation()}>{node}</span>;

  const columns: Column<IInspectionMethod>[] = [
    { key: 'name', header: 'Method', cell: (m) => stop(<InlineEdit value={m.name} onSave={(v) => inlineUpdate(m._id, { name: v })} className="font-medium" />) },
    { key: 'type', header: 'Method Type', cell: (m) => m.methodType ? <Badge variant="outline">{METHOD_TYPE_LABEL[m.methodType] || m.methodType}</Badge> : <span className="text-muted-foreground">—</span> },
    { key: 'desc', header: 'Description', cell: (m) => stop(<InlineEdit value={m.description || ''} onSave={(v) => inlineUpdate(m._id, { description: v })} className="text-muted-foreground" />) },
    { key: 'approval', header: 'Approval', cell: (m) => m.approvalStatus ? <Badge variant={APPROVAL_VARIANT[m.approvalStatus] || 'slate'}>{APPROVAL_LABEL[m.approvalStatus] || m.approvalStatus}</Badge> : <span className="text-muted-foreground">—</span> },
    { key: 'actions', header: '', width: 'w-12', cell: (m) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => setDetail(m)}><Eye className="h-4 w-4" /> View Details</DropdownItem>
          <DropdownItem onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
          <DropdownItem danger onClick={() => setConfirmDel(m)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
        </Dropdown>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Inspection Methods"
        description="Inspection methodologies used across the organization."
        action={<Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Method</Button>}
      />
      <DataTable columns={columns} data={inspectionMethods} loading={loading} onRowClick={(m) => setDetail(m)} emptyTitle="No methods" />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        {detail && (() => {
          const rows: [string, any][] = [
            ['Method Code', detail.methodId || '—'],
            ['Method Type', detail.methodType ? (METHOD_TYPE_LABEL[detail.methodType] || detail.methodType) : '—'],
            ['Reference Standard', detail.referenceStandard || '—'],
            ['Sample Size', detail.sampleSize || '—'],
            ['Approval Status', detail.approvalStatus ? (APPROVAL_LABEL[detail.approvalStatus] || detail.approvalStatus) : '—'],
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
                {(detail.equipmentRequired || []).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Equipment Required</dt>
                    <div className="flex flex-wrap gap-1.5">{(detail.equipmentRequired || []).map((e) => <Badge key={e} variant="outline">{e}</Badge>)}</div>
                  </div>
                )}
                {detail.acceptanceCriteria && <div className="mt-4 pt-4 border-t"><dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Acceptance Criteria</dt><dd className="text-sm">{detail.acceptanceCriteria}</dd></div>}
                <div className="mt-6 pt-6 border-t flex gap-2">
                  <Button variant="outline" onClick={() => { setDetail(null); openEdit(detail); }}><Pencil className="h-4 w-4" /> Edit Method</Button>
                </div>
              </SheetBody>
            </>
          );
        })()}
      </Sheet>

      <FormDrawer open={drawer} onOpenChange={setDrawer} title={editing ? 'Edit Method' : 'Add Method'} onSubmit={submit} submitLabel={editing ? 'Update' : 'Add'}>
        <ConfigForm fields={inspectionMethodFields(equipment, users)} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={async () => {
          if (!confirmDel) return;
          try {
            await remove(confirmDel._id);
            toast.success('Deleted');
            setConfirmDel(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong');
          }
        }} />
    </PageWrapper>
  );
};
