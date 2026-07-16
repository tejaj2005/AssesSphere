import { useState, useMemo } from 'react';
import { Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { InlineEdit } from '@/components/shared/InlineEdit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { ConfigForm, validateConfigForm, FieldDef } from '@/components/shared/ConfigForm';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';

/** Backend category enum — the mock had no category field at all, so this is new. */
const CATEGORY_OPTIONS = [
  { label: 'Incoming Material', value: 'INCOMING_MATERIAL' },
  { label: 'In-Process', value: 'IN_PROCESS' },
  { label: 'Final Product', value: 'FINAL_PRODUCT' },
  { label: 'Component', value: 'COMPONENT' },
  { label: 'Calibration', value: 'CALIBRATION' },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

interface InspectionTypeDoc {
  _id: string;
  id: string;
  name: string;
  typeId: string;
  category: string;
  description?: string;
  organization: string;
}

/** Fields defined locally (backend model is just name/category/description —
 * the old shared `inspectionTypeFields` helper carried a lot of mock-only fields
 * like frequency/products/stages/regulatory that don't exist on the backend). */
const fields: FieldDef[] = [
  { section: 'Details', name: 'name', label: 'Inspection Type Name', type: 'text', required: true, col: 'half' },
  { name: 'category', label: 'Category', type: 'select', required: true, col: 'half', options: CATEGORY_OPTIONS },
  { name: 'description', label: 'Description', type: 'textarea' },
];

const emptyForm = { name: '', category: '', description: '' };

export const InspectionTypesPage = () => {
  const { user } = useAuth();
  const { items: inspectionTypes, loading, create, update, remove } = useApiResource<InspectionTypeDoc>('/admin/inspection-types');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<InspectionTypeDoc | null>(null);

  const filtered = useMemo(
    () => inspectionTypes.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())),
    [inspectionTypes, search],
  );

  const submit = async () => {
    const v = validateConfigForm(fields, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix errors'); return; }
    try {
      await create({
        name: form.name.trim(),
        category: form.category,
        description: form.description?.trim() || undefined,
        organization: user?.organization,
      } as any);
      toast.success('Inspection type added');
      setForm(emptyForm);
      setDrawer(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const rename = async (t: InspectionTypeDoc, v: string) => {
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

  const columns: Column<InspectionTypeDoc>[] = [
    { key: 'name', header: 'Inspection Type', sortable: true, sortValue: (t) => t.name, cell: (t) => <InlineEdit value={t.name} onSave={(v) => rename(t, v)} className="font-medium" /> },
    { key: 'category', header: 'Category', sortable: true, sortValue: (t) => t.category, cell: (t) => <Badge variant="secondary">{CATEGORY_LABEL[t.category] || t.category}</Badge> },
    { key: 'typeId', header: 'ID', cell: (t) => <span className="text-xs font-mono text-muted-foreground">{t.typeId || t.id}</span> },
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
        title="Inspection Types"
        description="Categorize inspection workflows."
        action={<Button variant="accent" onClick={() => { setErrs({}); setForm(emptyForm); setDrawer(true); }}><Plus className="h-4 w-4" /> Add Type</Button>}
      />
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
      </div>
      <DataTable columns={columns} data={filtered} emptyTitle="No inspection types" />

      <FormDrawer open={drawer} onOpenChange={setDrawer} title="Add Inspection Type" onSubmit={submit} submitLabel="Add">
        <ConfigForm fields={fields} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={confirmDelete} />
    </PageWrapper>
  );
};
