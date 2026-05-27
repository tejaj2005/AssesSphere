import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { useData } from '@/context/DataContext';
import { nextId } from '@/lib/utils';
import type { Material } from '@/types';

export const MaterialsPage = () => {
  const { materials, materialTypes, suppliers, addMaterial, updateMaterial, deleteMaterial } = useData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const initialForm = { name: '', code: '', materialTypeId: '' };
  const [form, setForm] = useState(initialForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<Material | null>(null);

  const filtered = useMemo(() => materials.filter((m) => {
    if (search && !(m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase()))) return false;
    if (typeFilter !== 'all' && m.materialTypeId !== typeFilter) return false;
    return true;
  }), [materials, search, typeFilter]);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm, code: nextId('MAT', materials), materialTypeId: materialTypes[0]?.id || '' }); setErrs({}); setDrawer(true); };
  const openEdit = (m: Material) => { setEditing(m); setForm({ name: m.name, code: m.code, materialTypeId: m.materialTypeId }); setErrs({}); setDrawer(true); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.code.trim()) e.code = 'Required';
    if (!form.materialTypeId) e.materialTypeId = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    const res = editing ? updateMaterial(editing.id, form) : addMaterial(form);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(editing ? 'Updated' : 'Created');
    setDrawer(false);
  };

  const columns: Column<Material>[] = [
    { key: 'name', header: 'Material', sortable: true, sortValue: (m) => m.name, cell: (m) => <span className="font-medium">{m.name}</span> },
    { key: 'code', header: 'Code', cell: (m) => <span className="text-xs font-mono text-muted-foreground">{m.code}</span> },
    { key: 'type', header: 'Type', cell: (m) => { const t = materialTypes.find((x) => x.id === m.materialTypeId); return t ? <Badge variant="accent">{t.name}</Badge> : '—'; } },
    { key: 'sup', header: 'Suppliers', cell: (m) => {
      const supList = suppliers.filter((s) => s.materialIds.includes(m.id));
      if (supList.length === 0) return <span className="text-xs text-muted-foreground italic">None</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {supList.slice(0, 2).map((s) => <Badge key={s.id} variant="accent" className="text-[10px]">{s.name}</Badge>)}
          {supList.length > 2 && <Badge variant="outline" className="text-[10px]">+{supList.length - 2}</Badge>}
        </div>
      );
    } },
    { key: 'actions', header: '', width: 'w-12', cell: (m) => (
      <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        <DropdownItem onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
        <DropdownItem danger onClick={() => setConfirmDel(m)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
      </Dropdown>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Materials"
        description="Maintain your material inventory."
        action={
          <>
            <DataToolbar data={materials.map((m) => ({ Name: m.name, Code: m.code, Type: materialTypes.find((t) => t.id === m.materialTypeId)?.name || '' }))} filename="pqas-materials" />
            <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Material</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <Select value={typeFilter} onChange={setTypeFilter} options={[{ label: 'All Types', value: 'all' }, ...materialTypes.map((t) => ({ label: t.name, value: t.id }))]} className="sm:w-44" />
      </div>
      <DataTable columns={columns} data={filtered} emptyTitle="No materials" />

      <FormDrawer open={drawer} onOpenChange={setDrawer} title={editing ? 'Edit Material' : 'Add Material'} onSubmit={submit} submitLabel={editing ? 'Update' : 'Create'}>
        <div className="space-y-1.5"><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} error={!!errs.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrs({ ...errs, name: '' }); }} />{errs.name && <p className="text-xs text-destructive">{errs.name}</p>}</div>
        <div className="space-y-1.5"><Label>Code <span className="text-destructive">*</span></Label><Input value={form.code} error={!!errs.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setErrs({ ...errs, code: '' }); }} />{errs.code && <p className="text-xs text-destructive">{errs.code}</p>}</div>
        <div className="space-y-1.5"><Label>Material Type <span className="text-destructive">*</span></Label><Select value={form.materialTypeId} onChange={(v) => { setForm({ ...form, materialTypeId: v }); setErrs({ ...errs, materialTypeId: '' }); }} options={materialTypes.map((t) => ({ label: t.name, value: t.id }))} error={!!errs.materialTypeId} />{errs.materialTypeId && <p className="text-xs text-destructive">{errs.materialTypeId}</p>}</div>
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={() => { if (confirmDel) { const r = deleteMaterial(confirmDel.id); if (r.success) { toast.success('Deleted'); setConfirmDel(null); } else toast.error(r.error); } }} />
    </PageWrapper>
  );
};
