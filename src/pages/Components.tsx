import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { useData } from '@/context/DataContext';
import { nextId } from '@/lib/utils';
import type { ProductComponent } from '@/types';

export const ComponentsPage = () => {
  const { components, products, addComponent, updateComponent, deleteComponent } = useData();
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductComponent | null>(null);
  const [form, setForm] = useState({ name: '', code: '', productId: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<ProductComponent | null>(null);

  const filtered = useMemo(() => components.filter((c) => {
    if (search && !(c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))) return false;
    if (productFilter !== 'all' && c.productId !== productFilter) return false;
    return true;
  }), [components, search, productFilter]);

  const openAdd = () => { setEditing(null); setForm({ name: '', code: nextId('COMP', components), productId: products[0]?.id || '' }); setErrs({}); setDrawerOpen(true); };
  const openEdit = (c: ProductComponent) => { setEditing(c); setForm({ name: c.name, code: c.code, productId: c.productId }); setErrs({}); setDrawerOpen(true); };

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
    { key: 'product', header: 'Parent Product', cell: (c) => { const p = products.find((x) => x.id === c.productId); return p ? <Link to={`/admin/products/${p.id}`}><Badge variant="accent" className="hover:bg-accent/25">{p.name}</Badge></Link> : '—'; } },
    { key: 'actions', header: '', width: 'w-12', cell: (c) => (
      <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        <DropdownItem onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
        <DropdownItem danger onClick={() => setConfirmDel(c)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
      </Dropdown>
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
      <DataTable columns={columns} data={filtered} emptyTitle="No components" />

      <FormDrawer
        open={drawerOpen} onOpenChange={setDrawerOpen}
        title={editing ? 'Edit Component' : 'Add Component'}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Create'}
      >
        <div className="space-y-1.5">
          <Label>Component Name <span className="text-destructive">*</span></Label>
          <Input value={form.name} error={!!errs.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrs({ ...errs, name: '' }); }} />
          {errs.name && <p className="text-xs text-destructive">{errs.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Component Code <span className="text-destructive">*</span></Label>
          <Input value={form.code} error={!!errs.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setErrs({ ...errs, code: '' }); }} />
          {errs.code && <p className="text-xs text-destructive">{errs.code}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Parent Product <span className="text-destructive">*</span></Label>
          <Select value={form.productId} onChange={(v) => { setForm({ ...form, productId: v }); setErrs({ ...errs, productId: '' }); }} options={products.map((p) => ({ label: p.name, value: p.id }))} error={!!errs.productId} placeholder="Select product" />
          {errs.productId && <p className="text-xs text-destructive">{errs.productId}</p>}
        </div>
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
