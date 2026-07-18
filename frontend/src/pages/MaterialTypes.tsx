import { useState } from 'react';
import { Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { InlineEdit } from '@/components/shared/InlineEdit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { ConfigForm, validateConfigForm, FieldDef } from '@/components/shared/ConfigForm';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';

/** Backend MaterialType (server/models/MaterialType.ts) is bare-bones — just
 * name/typeId/description. The mock's regulatoryClass/storageTemperature/
 * handlingRequirements/status fields have no backend column and this model has
 * no `specifications` bag to stash them in (unlike Material/Component), so
 * they're dropped from the form entirely. */
interface ApiMaterialType {
  _id: string;
  id: string;
  name: string;
  typeId: string;
  description?: string;
  organization: string;
}

interface ApiMaterialLite {
  _id: string;
  id: string;
  materialType?: string | { _id: string };
}

const fields: FieldDef[] = [
  { section: 'Details', name: 'name', label: 'Material Type Name', type: 'text', required: true, col: 'half' },
  { name: 'typeId', label: 'Code', type: 'text', col: 'half', help: 'Leave blank to auto-generate' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

const emptyForm = { name: '', typeId: '', description: '' };

export const MaterialTypesPage = () => {
  const { user } = useAuth();
  const { items: materialTypes, loading, create, update, remove } = useApiResource<ApiMaterialType>('/admin/material-types');
  const { items: materials } = useApiResource<ApiMaterialLite>('/admin/materials');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<ApiMaterialType | null>(null);

  const countFor = (typeId: string) => materials.filter((m) => {
    const mt = m.materialType as any;
    const id = mt ? (typeof mt === 'string' ? mt : mt._id) : '';
    return id === typeId;
  }).length;

  const submit = async () => {
    const v = validateConfigForm(fields, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix errors'); return; }
    try {
      await create({
        name: form.name.trim(),
        typeId: form.typeId?.trim() || undefined,
        description: form.description?.trim() || undefined,
        organization: user?.organization,
      } as any);
      toast.success('Type added');
      setForm(emptyForm);
      setDrawer(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const rename = async (t: ApiMaterialType, v: string) => {
    try {
      await update(t.id, { name: v } as any);
      toast.success('Updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    try {
      await remove(confirmDel.id);
      toast.success('Deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setConfirmDel(null);
    }
  };

  const columns: Column<ApiMaterialType>[] = [
    { key: 'name', header: 'Type', sortable: true, sortValue: (t) => t.name, cell: (t) => <InlineEdit value={t.name} onSave={(v) => rename(t, v)} className="font-medium" /> },
    { key: 'typeId', header: 'Code', cell: (t) => <span className="text-xs font-mono text-muted-foreground">{t.typeId || '—'}</span> },
    { key: 'count', header: 'Materials', cell: (t) => <Badge variant="outline">{countFor(t.id)}</Badge> },
    { key: 'actions', header: '', width: 'w-12', cell: (t) => (
      <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        <DropdownItem danger onClick={() => setConfirmDel(t)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
      </Dropdown>
    ) },
  ];

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader
        title="Material Types"
        description="Categorize materials by type."
        action={<Button variant="accent" onClick={() => { setErrs({}); setForm(emptyForm); setDrawer(true); }}><Plus className="h-4 w-4" /> Add Type</Button>}
      />
      <DataTable columns={columns} data={materialTypes} emptyTitle="No material types" />

      <FormDrawer open={drawer} onOpenChange={setDrawer} title="Add Material Type" onSubmit={submit} submitLabel="Add">
        <ConfigForm fields={fields} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={confirmDelete} />
    </PageWrapper>
  );
};
