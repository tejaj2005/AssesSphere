import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ConfigForm } from '@/components/shared/ConfigForm';
import { componentFields } from '@/lib/entityFields';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { Sheet, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { useData } from '@/context/DataContext';
import { nextId } from '@/lib/utils';
import type { ProductComponent } from '@/types';

const TYPE_LABEL: Record<string, string> = { RAW: 'Raw Material', SUB_ASSEMBLY: 'Sub-assembly', CONSUMABLE: 'Consumable' };

const emptyForm = { name: '', code: '', productId: '', componentType: 'RAW', uom: 'pcs', supplierId: '', minimumStock: '', leadTime: '', certificate: false, storage: '', qualityStandard: '', notes: '' };

export const ComponentsPage = () => {
  const { components, products, suppliers, addComponent, updateComponent, deleteComponent } = useData();
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductComponent | null>(null);
  const [detail, setDetail] = useState<ProductComponent | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<ProductComponent | null>(null);

  const filtered = useMemo(() => components.filter((c) => {
    if (search && !(c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))) return false;
    if (productFilter !== 'all' && c.productId !== productFilter) return false;
    return true;
  }), [components, search, productFilter]);

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, code: nextId('COMP', components), productId: products[0]?.id || '' }); setErrs({}); setDrawerOpen(true); };
  const openEdit = (c: ProductComponent) => { setEditing(c); setForm({ ...emptyForm, ...c }); setErrs({}); setDrawerOpen(true); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.code.trim()) e.code = 'Required';
    if (!form.productId) e.productId = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    const res = editing ? updateComponent(editing.id, form) : addComponent(form);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(editing ? 'Component updated' : 'Component created');
    setDrawerOpen(false);
  };

  const columns: Column<ProductComponent>[] = [
    { key: 'name', header: 'Component', sortable: true, sortValue: (c) => c.name, cell: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'code', header: 'Code', cell: (c) => <span className="text-xs font-mono text-muted-foreground">{c.code}</span> },
    { key: 'type', header: 'Type', cell: (c) => c.componentType ? <Badge variant="outline">{TYPE_LABEL[c.componentType] || c.componentType}</Badge> : '—' },
    { key: 'product', header: 'Parent Product', cell: (c) => { const p = products.find((x) => x.id === c.productId); return p ? <Link to={`/admin/products/${p.id}`} onClick={(e) => e.stopPropagation()}><Badge variant="accent" className="hover:bg-accent/25">{p.name}</Badge></Link> : '—'; } },
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
        <Select value={productFilter} onChange={setProductFilter} options={[{ label: 'All Products', value: 'all' }, ...products.map((p) => ({ label: p.name, value: p.id }))]} className="sm:w-56" />
      </div>
      <DataTable columns={columns} data={filtered} onRowClick={(c) => setDetail(c)} emptyTitle="No components" />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        {detail && (() => {
          const product = products.find((p) => p.id === detail.productId);
          const supplier = suppliers.find((s) => s.id === detail.supplierId);
          const rows: [string, any][] = [
            ['Code', detail.code],
            ['Type', detail.componentType ? (TYPE_LABEL[detail.componentType] || detail.componentType) : '—'],
            ['Parent Product', product?.name || '—'],
            ['Default Supplier', supplier?.name || '—'],
            ['Unit of Measure', detail.uom || '—'],
            ['Minimum Stock', detail.minimumStock ?? '—'],
            ['Lead Time (days)', detail.leadTime ?? '—'],
            ['Certificate Required', detail.certificate ? 'Yes' : 'No'],
            ['Storage', detail.storage || '—'],
            ['Quality Standard', detail.qualityStandard || '—'],
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
                {detail.notes && <div className="mt-4 pt-4 border-t"><dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</dt><dd className="text-sm">{detail.notes}</dd></div>}
                <div className="mt-6 pt-6 border-t flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => { setDetail(null); openEdit(detail); }}><Pencil className="h-4 w-4" /> Edit</Button>
                  {product && <Link to={`/admin/products/${product.id}`}><Button variant="outline"><Eye className="h-4 w-4" /> View Product</Button></Link>}
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
        <ConfigForm fields={componentFields(products, suppliers)} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        entityName={confirmDel?.name}
        onConfirm={() => { if (confirmDel) { deleteComponent(confirmDel.id); toast.success('Component deleted'); setConfirmDel(null); } }}
      />
    </PageWrapper>
  );
};
