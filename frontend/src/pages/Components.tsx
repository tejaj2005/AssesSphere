import { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ConfigForm, FieldDef, FieldOption } from '@/components/shared/ConfigForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { Sheet, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const TYPE_LABEL: Record<string, string> = { RAW: 'Raw Material', SUB_ASSEMBLY: 'Sub-assembly', CONSUMABLE: 'Consumable' };

const UOM_OPTS: FieldOption[] = [
  { label: 'kilograms (kg)', value: 'kg' },
  { label: 'pieces (pcs)',   value: 'pcs' },
  { label: 'liters (L)',     value: 'L' },
  { label: 'meters (m)',     value: 'm' },
  { label: 'grams (g)',      value: 'g' },
];

/** Backend Component shape (server/models/Component.ts). `specifications` is a free-form bag
 * used here to hold mock-only fields that have no dedicated backend column. */
interface ApiComponent {
  _id: string;
  name: string;
  componentId: string;
  description?: string;
  specifications?: Record<string, any>;
  material?: string | { _id: string; name: string };
  primarySupplier?: string | { _id: string; name: string };
  inspectionRequired?: boolean;
  organization: string;
  createdAt?: string;
  updatedAt?: string;
}

const emptyForm = {
  name: '', componentId: '', componentType: 'RAW', uom: 'pcs', primarySupplier: '',
  minimumStock: '', leadTime: '', inspectionRequired: false, storage: '', qualityStandard: '', description: '',
};

/** id of a possibly-populated ref field */
const refId = (v: any): string => (v ? (typeof v === 'string' ? v : v._id || v.id || '') : '');
const refName = (v: any): string => (v && typeof v === 'object' ? v.name : '');

export const ComponentsPage = () => {
  const { user } = useAuth();
  const { items: components, loading, create, update, remove } = useApiResource<ApiComponent>('/admin/components');
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.getList<{ _id: string; name: string }>('/admin/suppliers')
      .then(({ data }) => setSuppliers(data.map((s) => ({ id: s._id, name: s.name }))))
      .catch(() => {});
  }, []);

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ApiComponent | null>(null);
  const [detail, setDetail] = useState<ApiComponent | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<ApiComponent | null>(null);

  const filtered = useMemo(() => components.filter((c) => {
    if (search && !(c.name.toLowerCase().includes(search.toLowerCase()) || c.componentId?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [components, search]);

  const fields: FieldDef[] = [
    { section: 'Basic',       name: 'name',          label: 'Component Name', type: 'text', required: true, col: 'half' },
    {                         name: 'componentId',   label: 'Component Code', type: 'text', col: 'half', help: 'Leave blank to auto-generate' },
    {                         name: 'componentType', label: 'Component Type', type: 'select', col: 'half',
                              options: [{ label: 'Raw Material', value: 'RAW' }, { label: 'Sub-assembly', value: 'SUB_ASSEMBLY' }, { label: 'Consumable', value: 'CONSUMABLE' }] },
    {                         name: 'uom',           label: 'Unit of Measure', type: 'select', col: 'half', options: UOM_OPTS },
    {                         name: 'primarySupplier', label: 'Default Supplier', type: 'select', col: 'half',
                              options: [{ label: '— None —', value: '' }, ...suppliers.map((s) => ({ label: s.name, value: s.id }))] },

    { section: 'Inventory',   name: 'minimumStock',  label: 'Minimum Stock',    type: 'number', col: 'third' },
    {                         name: 'leadTime',      label: 'Lead Time (days)', type: 'number', col: 'third' },
    {                         name: 'inspectionRequired', label: 'Inspection Required', type: 'toggle', col: 'third' },
    {                         name: 'storage',       label: 'Storage Requirements', type: 'text' },
    {                         name: 'qualityStandard', label: 'Quality Standard', type: 'text', placeholder: 'e.g. ISO 9001 §8.4' },
    {                         name: 'description',  label: 'Notes', type: 'textarea' },
  ];

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrs({}); setDrawerOpen(true); };
  const openEdit = (c: ApiComponent) => {
    setEditing(c);
    setForm({
      name: c.name,
      componentId: c.componentId,
      componentType: c.specifications?.componentType || 'RAW',
      uom: c.specifications?.uom || 'pcs',
      primarySupplier: refId(c.primarySupplier),
      minimumStock: c.specifications?.minimumStock ?? '',
      leadTime: c.specifications?.leadTime ?? '',
      inspectionRequired: !!c.inspectionRequired,
      storage: c.specifications?.storage || '',
      qualityStandard: c.specifications?.qualityStandard || '',
      description: c.description || '',
    });
    setErrs({});
    setDrawerOpen(true);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;

    const payload: Partial<ApiComponent> = {
      name: form.name,
      componentId: form.componentId || undefined,
      description: form.description || undefined,
      inspectionRequired: !!form.inspectionRequired,
      primarySupplier: form.primarySupplier || undefined,
      specifications: {
        componentType: form.componentType,
        uom: form.uom,
        minimumStock: form.minimumStock,
        leadTime: form.leadTime,
        storage: form.storage,
        qualityStandard: form.qualityStandard,
      },
      ...(editing ? {} : { organization: user?.organization }),
    };

    try {
      if (editing) await update(editing._id, payload);
      else await create(payload);
      toast.success(editing ? 'Component updated' : 'Component created');
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await remove(confirmDel._id);
      toast.success('Component deleted');
      setConfirmDel(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const columns: Column<ApiComponent>[] = [
    { key: 'name', header: 'Component', sortable: true, sortValue: (c) => c.name, cell: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'code', header: 'Code', cell: (c) => <span className="text-xs font-mono text-muted-foreground">{c.componentId}</span> },
    { key: 'type', header: 'Type', cell: (c) => c.specifications?.componentType ? <Badge variant="outline">{TYPE_LABEL[c.specifications.componentType] || c.specifications.componentType}</Badge> : '—' },
    { key: 'supplier', header: 'Default Supplier', cell: (c) => refName(c.primarySupplier) ? <Badge variant="accent">{refName(c.primarySupplier)}</Badge> : '—' },
    { key: 'actions', header: '', width: 'w-12', cell: (c) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => setDetail(c)}><Eye className="h-4 w-4" /> View Details</DropdownItem>
          <DropdownItem onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
          <DropdownItem danger onClick={() => setConfirmDel(c)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
        </Dropdown>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Components"
        description="Manage product sub-components."
        action={<Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Component</Button>}
      />
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search components…" className="sm:w-72" />
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} onRowClick={(c) => setDetail(c)} emptyTitle="No components" />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        {detail && (() => {
          const rows: [string, any][] = [
            ['Code', detail.componentId],
            ['Type', detail.specifications?.componentType ? (TYPE_LABEL[detail.specifications.componentType] || detail.specifications.componentType) : '—'],
            ['Default Supplier', refName(detail.primarySupplier) || '—'],
            ['Unit of Measure', detail.specifications?.uom || '—'],
            ['Minimum Stock', detail.specifications?.minimumStock ?? '—'],
            ['Lead Time (days)', detail.specifications?.leadTime ?? '—'],
            ['Inspection Required', detail.inspectionRequired ? 'Yes' : 'No'],
            ['Storage', detail.specifications?.storage || '—'],
            ['Quality Standard', detail.specifications?.qualityStandard || '—'],
          ];
          return (
            <>
              <SheetHeader><SheetTitle>{detail.name}</SheetTitle></SheetHeader>
              <SheetBody>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {rows.map(([k, v]) => (
                    <div key={k}><dt className="text-xs text-muted-foreground uppercase tracking-wider">{k}</dt><dd className="mt-1">{v}</dd></div>
                  ))}
                </dl>
                {detail.description && <div className="mt-4 pt-4 border-t"><dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</dt><dd className="text-sm">{detail.description}</dd></div>}
                <div className="mt-6 pt-6 border-t flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => { setDetail(null); openEdit(detail); }}><Pencil className="h-4 w-4" /> Edit</Button>
                </div>
              </SheetBody>
            </>
          );
        })()}
      </Sheet>

      <FormDrawer
        open={drawerOpen} onOpenChange={setDrawerOpen}
        title={editing ? 'Edit Component' : 'Add Component'}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Create'}
      >
        <ConfigForm fields={fields} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        entityName={confirmDel?.name}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
};
