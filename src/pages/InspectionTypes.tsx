import { useState, useMemo } from 'react';
import { Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { InlineEdit } from '@/components/shared/InlineEdit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { ConfigForm, validateConfigForm } from '@/components/shared/ConfigForm';
import { inspectionTypeFields } from '@/lib/entityFields';
import { useData } from '@/context/DataContext';
import type { InspectionType } from '@/types';

export const InspectionTypesPage = () => {
  const { inspectionTypes, products, manufacturingStages, assemblingStages, addInspectionType, updateInspectionType, deleteInspectionType } = useData();
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState<any>({ name: '', code: '', category: 'IN_PROCESS', frequency: 'PER_BATCH', productIds: [], stageIds: [], regulatory: false, status: true, criteria: '', requiredDocs: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<InspectionType | null>(null);

  const filtered = useMemo(() => inspectionTypes.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())), [inspectionTypes, search]);

  const submit = async () => {
    const v = validateConfigForm(inspectionTypeFields(products, [...manufacturingStages, ...assemblingStages]), form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix errors'); return; }
    const res = addInspectionType({ name: form.name.trim() } as any);
    if (!res.success) { toast.error(res.error); return; }
    toast.success('Inspection type added');
    setForm({ name: '', code: '', category: 'IN_PROCESS', frequency: 'PER_BATCH', productIds: [], stageIds: [], regulatory: false, status: true, criteria: '', requiredDocs: '' });
    setDrawer(false);
  };

  const columns: Column<InspectionType>[] = [
    { key: 'name', header: 'Inspection Type', sortable: true, sortValue: (t) => t.name, cell: (t) => <InlineEdit value={t.name} onSave={(v) => { const r = updateInspectionType(t.id, { name: v }); if (r.success) toast.success('Updated'); else toast.error(r.error); }} className="font-medium" /> },
    { key: 'id', header: 'ID', cell: (t) => <span className="text-xs font-mono text-muted-foreground">{t.id}</span> },
    { key: 'actions', header: '', width: 'w-12', cell: (t) => (
      <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        <DropdownItem danger onClick={() => setConfirmDel(t)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
      </Dropdown>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Inspection Types"
        description="Categorize inspection workflows."
        action={<Button variant="accent" onClick={() => { setErrs({}); setDrawer(true); }}><Plus className="h-4 w-4" /> Add Type</Button>}
      />
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
      </div>
      <DataTable columns={columns} data={filtered} emptyTitle="No inspection types" />

      <FormDrawer open={drawer} onOpenChange={setDrawer} title="Add Inspection Type" onSubmit={submit} submitLabel="Add">
        <ConfigForm fields={inspectionTypeFields(products, [...manufacturingStages, ...assemblingStages])} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={() => { if (confirmDel) { deleteInspectionType(confirmDel.id); toast.success('Deleted'); setConfirmDel(null); } }} />
    </PageWrapper>
  );
};
