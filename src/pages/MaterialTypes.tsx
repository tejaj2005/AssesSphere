import { useState } from 'react';
import { Plus, Trash2, MoreHorizontal } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { ConfigForm, validateConfigForm } from '@/components/shared/ConfigForm';
import { materialTypeFields } from '@/lib/entityFields';
import { useData } from '@/context/DataContext';
import type { MaterialType } from '@/types';

export const MaterialTypesPage = () => {
  const { materialTypes, materials, addMaterialType, updateMaterialType, deleteMaterialType } = useData();
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState<any>({ name: '', code: '', regulatoryClass: 'GENERAL', storageTemperature: '', handlingRequirements: '', description: '', status: true });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<MaterialType | null>(null);

  const submit = async () => {
    const v = validateConfigForm(materialTypeFields, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix errors'); return; }
    const res = addMaterialType({ name: form.name.trim() } as any);
    if (!res.success) { toast.error(res.error || 'Failed'); return; }
    toast.success('Type added');
    setForm({ name: '', code: '', regulatoryClass: 'GENERAL', storageTemperature: '', handlingRequirements: '', description: '', status: true });
    setDrawer(false);
  };

  const columns: Column<MaterialType>[] = [
    { key: 'name', header: 'Type', sortable: true, sortValue: (t) => t.name, cell: (t) => <InlineEdit value={t.name} onSave={(v) => { updateMaterialType(t.id, { name: v }); toast.success('Updated'); }} className="font-medium" /> },
    { key: 'count', header: 'Materials', cell: (t) => <Badge variant="outline">{materials.filter((m) => m.materialTypeId === t.id).length}</Badge> },
    { key: 'actions', header: '', width: 'w-12', cell: (t) => (
      <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        <DropdownItem danger onClick={() => setConfirmDel(t)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
      </Dropdown>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Material Types"
        description="Categorize materials by type."
        action={<Button variant="accent" onClick={() => { setErrs({}); setDrawer(true); }}><Plus className="h-4 w-4" /> Add Type</Button>}
      />
      <DataTable columns={columns} data={materialTypes} emptyTitle="No material types" />

      <FormDrawer open={drawer} onOpenChange={setDrawer} title="Add Material Type" onSubmit={submit} submitLabel="Add">
        <ConfigForm fields={materialTypeFields} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={() => { if (confirmDel) { const r = deleteMaterialType(confirmDel.id); if (r.success) { toast.success('Deleted'); setConfirmDel(null); } else toast.error(r.error); } }} />
    </PageWrapper>
  );
};
