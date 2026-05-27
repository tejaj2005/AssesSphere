import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, MoreHorizontal, Grid3x3, List, Package, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { MultiSelectChips } from '@/components/shared/MultiSelectChips';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { useData } from '@/context/DataContext';
import { nextId, cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { Product } from '@/types';

export const ProductsPage = () => {
  const { products, components, manufacturingStages, assemblingStages, addProduct, updateProduct, deleteProduct } = useData();
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDel, setConfirmDel] = useState<Product | null>(null);
  const initialForm = { name: '', code: '', manufacturingStageIds: [] as string[], assemblingStageIds: [] as string[] };
  const [form, setForm] = useState(initialForm);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const filtered = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())), [products, search]);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm, code: nextId('PROD', products) }); setErrs({}); setDrawerOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, code: p.code, manufacturingStageIds: p.manufacturingStageIds, assemblingStageIds: p.assemblingStageIds }); setErrs({}); setDrawerOpen(true); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.code.trim()) e.code = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    const res = editing ? updateProduct(editing.id, form) : addProduct(form);
    if (!res.success) { toast.error(res.error || 'Failed'); return; }
    toast.success(editing ? 'Product updated' : 'Product created');
    setDrawerOpen(false);
  };

  const handleDelete = () => {
    if (!confirmDel) return;
    const res = deleteProduct(confirmDel.id);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(`${confirmDel.name} deleted`);
    setConfirmDel(null);
  };

  const columns: Column<Product>[] = [
    { key: 'name', header: 'Product', sortable: true, sortValue: (p) => p.name, cell: (p) => <Link to={`/admin/products/${p.id}`} className="font-medium hover:text-accent">{p.name}</Link> },
    { key: 'code', header: 'Code', sortable: true, sortValue: (p) => p.code, cell: (p) => <span className="text-xs font-mono text-muted-foreground">{p.code}</span> },
    { key: 'comps', header: 'Components', cell: (p) => <Badge variant="outline">{components.filter((c) => c.productId === p.id).length}</Badge> },
    { key: 'mfg', header: 'Mfg Stages', cell: (p) => <Badge variant="accent">{p.manufacturingStageIds.length}</Badge> },
    { key: 'asm', header: 'Asm Stages', cell: (p) => <Badge variant="purple">{p.assemblingStageIds.length}</Badge> },
    { key: 'actions', header: '', width: 'w-12', cell: (p) => (
      <Dropdown trigger={<button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        <DropdownItem onClick={() => navigate(`/admin/products/${p.id}`)}>View Details</DropdownItem>
        <DropdownItem onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
        <DropdownItem danger onClick={() => setConfirmDel(p)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
      </Dropdown>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Products"
        description="Configure products with their manufacturing and assembly stages."
        action={
          <>
            <div className="inline-flex rounded-lg border p-0.5 bg-card">
              <button onClick={() => setView('grid')} className={cn('px-2.5 py-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button onClick={() => setView('list')} className={cn('px-2.5 py-1.5 rounded-md transition-colors', view === 'list' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <List className="h-4 w-4" />
              </button>
            </div>
            <DataToolbar data={products.map((p) => ({ Name: p.name, Code: p.code, Components: components.filter((c) => c.productId === p.id).length, MfgStages: p.manufacturingStageIds.length, AsmStages: p.assemblingStageIds.length }))} filename="pqas-products" />
            <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Product</Button>
          </>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search products…" className="sm:w-72" />
      </div>

      {view === 'list' ? (
        <DataTable columns={columns} data={filtered} emptyTitle="No products" />
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold">No products</h3>
          <p className="text-sm text-muted-foreground mb-4">{search ? 'Try a different search.' : 'Add your first product.'}</p>
          {!search && <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Product</Button>}
        </Card>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <motion.div key={p.id} variants={staggerItem} whileHover={{ y: -2 }}>
              <Card className="p-5 hover:shadow-md cursor-pointer h-full" onClick={() => navigate(`/admin/products/${p.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Package className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">{p.code}</Badge>
                </div>
                <h3 className="font-semibold mb-1">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{components.filter((c) => c.productId === p.id).length} components</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="accent" className="text-[10px]">{p.manufacturingStageIds.length} mfg</Badge>
                  <Badge variant="purple" className="text-[10px]">{p.assemblingStageIds.length} asm</Badge>
                </div>
                <div className="flex items-center text-xs text-accent pt-3 border-t">View details <ArrowRight className="h-3.5 w-3.5 ml-1" /></div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <FormDrawer
        open={drawerOpen} onOpenChange={setDrawerOpen}
        title={editing ? 'Edit Product' : 'Add Product'}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Create'}
      >
        <div className="space-y-1.5">
          <Label>Product Name <span className="text-destructive">*</span></Label>
          <Input value={form.name} error={!!errs.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrs({ ...errs, name: '' }); }} />
          {errs.name && <p className="text-xs text-destructive">{errs.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Product Code <span className="text-destructive">*</span></Label>
          <Input value={form.code} error={!!errs.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setErrs({ ...errs, code: '' }); }} />
          {errs.code && <p className="text-xs text-destructive">{errs.code}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Manufacturing Stages</Label>
          <MultiSelectChips
            options={manufacturingStages.map((s) => ({ label: s.name, value: s.id }))}
            values={form.manufacturingStageIds}
            onChange={(v) => setForm({ ...form, manufacturingStageIds: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Assembling Stages</Label>
          <MultiSelectChips
            options={assemblingStages.map((s) => ({ label: s.name, value: s.id }))}
            values={form.assemblingStageIds}
            onChange={(v) => setForm({ ...form, assemblingStageIds: v })}
          />
        </div>
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
