import { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { ConfigForm, FieldDef, FieldOption } from '@/components/shared/ConfigForm';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const UOM_OPTS: FieldOption[] = [
  { label: 'kilograms (kg)', value: 'kg' },
  { label: 'pieces (pcs)',   value: 'pcs' },
  { label: 'liters (L)',     value: 'L' },
  { label: 'meters (m)',     value: 'm' },
  { label: 'grams (g)',      value: 'g' },
];

/** Backend Material shape (server/models/Material.ts). `specifications` is a
 * free-form bag used here to hold mock-only fields with no dedicated backend
 * column (grade, casNumber, minimumStock, reorderPoint, leadTime, shelfLife,
 * msdsAvailable, storageConditions). Mock `code` -> `materialId`, mock
 * `materialTypeId` -> `materialType` (ref). */
interface ApiMaterial {
  _id: string;
  id: string;
  name: string;
  materialId: string;
  materialType?: string | { _id: string; name: string };
  description?: string;
  specifications?: Record<string, any>;
  unit: string;
  inspectionRequired: boolean;
  organization: string;
}

interface SupplierLite {
  _id: string;
  name: string;
  materials?: string[];
}

interface MaterialTypeLite {
  _id: string;
  id: string;
  name: string;
  [key: string]: any;
}

/** id of a possibly-populated ref field */
const refId = (v: any): string => (v ? (typeof v === 'string' ? v : v._id || v.id || '') : '');

const emptyForm = {
  name: '', materialId: '', materialType: '', unit: 'kg', grade: '', casNumber: '',
  minimumStock: '', reorderPoint: '', leadTime: '', shelfLife: '', msdsAvailable: false,
  storageConditions: '', inspectionRequired: true, description: '',
};

export const MaterialsPage = () => {
  const { user } = useAuth();
  const { items: materials, loading, create, update, remove } = useApiResource<ApiMaterial>('/admin/materials');
  const { items: materialTypes } = useApiResource<MaterialTypeLite>('/admin/material-types');
  const [suppliers, setSuppliers] = useState<SupplierLite[]>([]);

  useEffect(() => {
    api.getList<SupplierLite>('/admin/suppliers')
      .then(({ data }) => setSuppliers(data))
      .catch(() => {});
  }, []);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<ApiMaterial | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<ApiMaterial | null>(null);

  const fields: FieldDef[] = [
    { section: 'Identity',    name: 'name',          label: 'Material Name', type: 'text', required: true, col: 'half' },
    {                         name: 'materialId',    label: 'Material Code', type: 'text', col: 'half', help: 'Leave blank to auto-generate' },
    {                         name: 'materialType',  label: 'Material Type', type: 'select', required: true, col: 'half',
                              options: materialTypes.map((t) => ({ label: t.name, value: t.id })) },
    {                         name: 'unit',          label: 'Unit of Measure', type: 'select', col: 'half', options: UOM_OPTS },
    {                         name: 'grade',         label: 'Grade / Purity', type: 'text', col: 'half', placeholder: 'e.g. 99.5%' },
    {                         name: 'casNumber',     label: 'CAS Number', type: 'text', col: 'half', placeholder: 'e.g. 7440-66-6' },

    { section: 'Inventory',   name: 'minimumStock',  label: 'Minimum Stock', type: 'number', col: 'third' },
    {                         name: 'reorderPoint',  label: 'Reorder Point', type: 'number', col: 'third' },
    {                         name: 'leadTime',      label: 'Lead Time (days)', type: 'number', col: 'third' },
    {                         name: 'shelfLife',     label: 'Shelf Life (days)', type: 'number', col: 'half' },
    {                         name: 'msdsAvailable', label: 'MSDS Available', type: 'toggle', col: 'half' },
    {                         name: 'storageConditions', label: 'Storage Conditions', type: 'text' },

    { section: 'Status',      name: 'inspectionRequired', label: 'Inspection Required', type: 'toggle' },
    {                         name: 'description',  label: 'Notes', type: 'textarea' },
  ];

  const suppliersFor = (materialId: string) => suppliers.filter((s) => (s.materials || []).includes(materialId));

  const filtered = useMemo(() => materials.filter((m) => {
    if (search && !(m.name.toLowerCase().includes(search.toLowerCase()) || (m.materialId || '').toLowerCase().includes(search.toLowerCase()))) return false;
    if (typeFilter !== 'all' && refId(m.materialType) !== typeFilter) return false;
    return true;
  }), [materials, search, typeFilter]);

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, materialType: materialTypes[0]?.id || '' }); setErrs({}); setDrawer(true); };
  const openEdit = (m: ApiMaterial) => {
    setEditing(m);
    setForm({
      name: m.name,
      materialId: m.materialId,
      materialType: refId(m.materialType),
      unit: m.unit || 'kg',
      grade: m.specifications?.grade || '',
      casNumber: m.specifications?.casNumber || '',
      minimumStock: m.specifications?.minimumStock ?? '',
      reorderPoint: m.specifications?.reorderPoint ?? '',
      leadTime: m.specifications?.leadTime ?? '',
      shelfLife: m.specifications?.shelfLife ?? '',
      msdsAvailable: !!m.specifications?.msdsAvailable,
      storageConditions: m.specifications?.storageConditions || '',
      inspectionRequired: m.inspectionRequired ?? true,
      description: m.description || '',
    });
    setErrs({});
    setDrawer(true);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.materialType) e.materialType = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;

    const payload: Partial<ApiMaterial> = {
      name: form.name.trim(),
      materialId: form.materialId?.trim() || undefined,
      materialType: form.materialType,
      unit: form.unit,
      description: form.description?.trim() || undefined,
      inspectionRequired: !!form.inspectionRequired,
      specifications: {
        grade: form.grade,
        casNumber: form.casNumber,
        minimumStock: form.minimumStock,
        reorderPoint: form.reorderPoint,
        leadTime: form.leadTime,
        shelfLife: form.shelfLife,
        msdsAvailable: !!form.msdsAvailable,
        storageConditions: form.storageConditions,
      },
      ...(editing ? {} : { organization: user?.organization }),
    } as any;

    try {
      if (editing) await update(editing.id, payload);
      else await create(payload);
      toast.success(editing ? 'Updated' : 'Created');
      setDrawer(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await remove(confirmDel.id);
      toast.success('Deleted');
      setConfirmDel(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const columns: Column<ApiMaterial>[] = [
    { key: 'name', header: 'Material', sortable: true, sortValue: (m) => m.name, cell: (m) => <span className="font-medium">{m.name}</span> },
    { key: 'code', header: 'Code', cell: (m) => <span className="text-xs font-mono text-muted-foreground">{m.materialId}</span> },
    { key: 'type', header: 'Type', cell: (m) => {
      const t = materialTypes.find((x) => x.id === refId(m.materialType));
      return t ? <Badge variant="accent">{t.name}</Badge> : '—';
    } },
    { key: 'sup', header: 'Suppliers', cell: (m) => {
      const supList = suppliersFor(m.id);
      if (supList.length === 0) return <span className="text-xs text-muted-foreground italic">None</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {supList.slice(0, 2).map((s) => <Badge key={s._id} variant="accent" className="text-[10px]">{s.name}</Badge>)}
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
            <DataToolbar data={materials.map((m) => ({ Name: m.name, Code: m.materialId, Type: materialTypes.find((t) => t.id === refId(m.materialType))?.name || '' }))} filename="pqas-materials" />
            <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Material</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <Select value={typeFilter} onChange={setTypeFilter} options={[{ label: 'All Types', value: 'all' }, ...materialTypes.map((t) => ({ label: t.name, value: t.id }))]} className="sm:w-44" />
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} emptyTitle="No materials" />

      <FormDrawer open={drawer} onOpenChange={setDrawer} title={editing ? 'Edit Material' : 'Add Material'} onSubmit={submit} submitLabel={editing ? 'Update' : 'Create'}>
        <ConfigForm fields={fields} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={handleDelete} />
    </PageWrapper>
  );
};
