import { useState } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { InlineEdit } from '@/components/shared/InlineEdit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { ConfigForm } from '@/components/shared/ConfigForm';
import { inspectionMethodFields } from '@/lib/entityFields';
import { useData } from '@/context/DataContext';
import type { InspectionMethod } from '@/types';

export const InspectionMethodsPage = () => {
  const { inspectionMethods, equipment, users, addInspectionMethod, updateInspectionMethod, deleteInspectionMethod } = useData();
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<InspectionMethod | null>(null);
  const initForm: any = { name: '', code: '', methodType: 'PHYSICAL', referenceStandard: '', description: '', equipmentIds: [], sampleSize: '', acceptanceCriteria: '', approvalStatus: 'DRAFT', approvedById: '', effectiveDate: '', sopFile: '' };
  const [form, setForm] = useState<any>(initForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<InspectionMethod | null>(null);

  const openAdd = () => { setEditing(null); setForm(initForm); setErrs({}); setDrawer(true); };
  const openEdit = (m: InspectionMethod) => { setEditing(m); setForm({ ...initForm, name: m.name, description: m.description }); setErrs({}); setDrawer(true); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    const payload = { name: form.name, description: form.description };
    const res = editing ? updateInspectionMethod(editing.id, payload) : addInspectionMethod(payload);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(editing ? 'Method updated' : 'Method added');
    setDrawer(false);
  };

  const columns: Column<InspectionMethod>[] = [
    { key: 'name', header: 'Method', cell: (m) => m.isSystem ? <span className="font-medium">{m.name}</span> : <InlineEdit value={m.name} onSave={(v) => { updateInspectionMethod(m.id, { name: v }); toast.success('Updated'); }} className="font-medium" /> },
    { key: 'desc', header: 'Description', cell: (m) => <InlineEdit value={m.description} onSave={(v) => { updateInspectionMethod(m.id, { description: v }); toast.success('Updated'); }} className="text-muted-foreground" /> },
    { key: 'type', header: 'Type', cell: (m) => m.isSystem ? <Badge variant="slate">System</Badge> : <Badge variant="accent">Custom</Badge> },
    { key: 'actions', header: '', width: 'w-12', cell: (m) => (
      <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        {!m.isSystem && <DropdownItem onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>}
        {!m.isSystem && <DropdownItem danger onClick={() => setConfirmDel(m)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>}
        {m.isSystem && <DropdownItem disabled>System method</DropdownItem>}
      </Dropdown>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Inspection Methods"
        description="System and custom inspection methodologies."
        action={<Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Custom Method</Button>}
      />
      <DataTable columns={columns} data={inspectionMethods} emptyTitle="No methods" />

      <FormDrawer open={drawer} onOpenChange={setDrawer} title={editing ? 'Edit Method' : 'Add Custom Method'} onSubmit={submit} submitLabel={editing ? 'Update' : 'Add'}>
        <ConfigForm fields={inspectionMethodFields(equipment, users)} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={() => { if (confirmDel) { const r = deleteInspectionMethod(confirmDel.id); if (r.success) { toast.success('Deleted'); setConfirmDel(null); } else toast.error(r.error); } }} />
    </PageWrapper>
  );
};
