import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Grid3x3, List, Package, ArrowRight, Eye, Copy, Puzzle, Settings as SettingsIcon, Wrench, FileDown, Archive, History, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfigForm, FieldDef, validateConfigForm } from '@/components/shared/ConfigForm';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TypedConfirmDialog } from '@/components/shared/TypedConfirmDialog';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { nextId, cn, formatDate } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { downloadJSON } from '@/lib/exporters';
import type { Product } from '@/types';

export const ProductsPage = () => {
  const { products, components, manufacturingStages, assemblingStages, addProduct, updateProduct, deleteProduct } = useData();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDel, setConfirmDel] = useState<Product | null>(null);
  const [typedDel, setTypedDel] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const initialForm: any = {
    name: '', code: '', category: '', description: '', uom: 'pcs', batchSize: '', shelfLife: '',
    storageConditions: '', regulatoryClass: '', drawingRef: '', attachments: [], status: true, notes: '',
    manufacturingStageIds: [] as string[], assemblingStageIds: [] as string[],
  };
  const [form, setForm] = useState<any>(initialForm);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const canEdit = hasPermission('Products', 'edit');
  const canDelete = hasPermission('Products', 'delete');
  const canCreate = hasPermission('Products', 'create');

  const PRODUCT_FIELDS: FieldDef[] = [
    { section: 'Basic Information', name: 'name', label: 'Product Name', type: 'text', required: true, col: 'half' },
    {                               name: 'code', label: 'Product Code', type: 'text', required: true, col: 'half', help: 'Must be unique' },
    {                               name: 'category', label: 'Product Category', type: 'select', col: 'half',
                                    options: [{ label: 'Mechanical Assembly', value: 'MECHANICAL' }, { label: 'Electronics', value: 'ELECTRONICS' }, { label: 'Sub-assembly', value: 'SUBASSEMBLY' }, { label: 'Raw Material', value: 'RAW' }] },
    {                               name: 'uom',  label: 'Unit of Measure', type: 'select', col: 'half',
                                    options: [{ label: 'kg', value: 'kg' }, { label: 'pcs', value: 'pcs' }, { label: 'L (liters)', value: 'L' }, { label: 'm (meters)', value: 'm' }] },
    {                               name: 'description', label: 'Description', type: 'textarea' },

    { section: 'Specifications', name: 'batchSize', label: 'Standard Batch Size', type: 'number', col: 'half' },
    {                            name: 'shelfLife', label: 'Shelf Life (days)', type: 'number', col: 'half' },
    {                            name: 'storageConditions', label: 'Storage Conditions', type: 'text', col: 'half', placeholder: 'e.g. 15–25°C, dry' },
    {                            name: 'regulatoryClass', label: 'Regulatory Class', type: 'select', col: 'half',
                                 options: [{ label: 'General', value: 'GENERAL' }, { label: 'Medical Device', value: 'MEDICAL' }, { label: 'Pharmaceutical', value: 'PHARMA' }, { label: 'Hazardous', value: 'HAZ' }] },
    {                            name: 'drawingRef', label: 'Drawing / Spec Reference', type: 'text', col: 'half', placeholder: 'e.g. DWG-001' },
    {                            name: 'status', label: 'Active', type: 'toggle', col: 'half' },

    { section: 'Stages', name: 'manufacturingStageIds', label: 'Manufacturing Stages', type: 'multi-select', options: manufacturingStages.map((s) => ({ label: s.name, value: s.id })) },
    {                    name: 'assemblingStageIds',    label: 'Assembling Stages',    type: 'multi-select', options: assemblingStages.map((s) => ({ label: s.name, value: s.id })) },

    { section: 'Attachments', name: 'attachments', label: 'Attached Documents', type: 'file' },
    {                         name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const filtered = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())), [products, search]);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm, code: nextId('PROD', products) }); setErrs({}); setDrawerOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ ...initialForm, ...p, status: true }); setErrs({}); setDrawerOpen(true); };

  const submit = async () => {
    const v = validateConfigForm(PRODUCT_FIELDS, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix form errors'); return; }
    const payload: any = { ...form, manufacturingStageIds: form.manufacturingStageIds || [], assemblingStageIds: form.assemblingStageIds || [] };
    const res = editing ? updateProduct(editing.id, payload) : addProduct(payload);
    if (!res.success) { toast.error(res.error || 'Failed'); return; }
    toast.success(editing ? 'Product updated' : 'Product created');
    setDrawerOpen(false);
  };

  const cloneProduct = (p: Product) => {
    const res = addProduct({ ...p, name: `${p.name} (Copy)`, code: `${p.code}-COPY-${Date.now().toString().slice(-3)}` } as any);
    if (res.success) toast.success(`Cloned ${p.name}`);
    else toast.error(res.error || 'Clone failed');
  };

  const archiveProduct = (p: Product) => {
    toast.success(`${p.name} archived (soft delete)`);
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
      <ActionMenu actions={[
        { label: 'View Details',     icon: Eye,       onClick: () => setDetail(p) },
        { label: 'Edit Product',     icon: Pencil,    onClick: () => openEdit(p), show: canEdit },
        { label: 'Clone Product',    icon: Copy,      onClick: () => cloneProduct(p), show: canCreate, separatorBefore: true },
        { label: 'Manage Components',icon: Puzzle,    onClick: () => navigate(`/admin/components?product=${p.id}`) },
        { label: 'View MFG Stages',  icon: SettingsIcon, onClick: () => navigate(`/admin/products/${p.id}#mfg`) },
        { label: 'View ASM Stages',  icon: Wrench,    onClick: () => navigate(`/admin/products/${p.id}#asm`) },
        { label: 'Export to JSON',   icon: FileDown,  onClick: () => { downloadJSON(p.code, p); toast.success('Exported'); }, separatorBefore: true },
        { label: 'Archive Product',  icon: Archive,   onClick: () => setConfirmDel(p), show: canEdit },
        { label: 'View History',     icon: History,   onClick: () => toast.message('Audit history opening…') },
        { label: 'Delete Forever',   icon: Trash2,    onClick: () => setTypedDel(p), danger: true, show: canDelete, separatorBefore: true },
      ]} />
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

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen} className="!w-[640px]">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit Product' : 'Add Product'}</SheetTitle>
          <SheetDescription>{editing ? 'Update product configuration' : 'Configure a new product with specifications and stages'}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <ConfigForm fields={PRODUCT_FIELDS} value={form} onChange={setForm} errors={errs} />
        </SheetBody>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          <Button variant="accent" onClick={submit}>{editing ? 'Update' : 'Create'}</Button>
        </div>
      </Sheet>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[640px]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.name}</SheetTitle>
              <SheetDescription>{detail.code}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Code', detail.code], ['Created', formatDate(detail.createdAt)],
                  ['Category', (detail as any).category || '—'], ['UoM', (detail as any).uom || '—'],
                  ['Batch Size', (detail as any).batchSize || '—'], ['Shelf Life', (detail as any).shelfLife ? `${(detail as any).shelfLife} days` : '—'],
                  ['Regulatory Class', (detail as any).regulatoryClass || '—'], ['Drawing Ref', (detail as any).drawingRef || '—'],
                ].map(([l, v]) => (
                  <div key={l as string}><dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">{l}</dt><dd className="mt-1">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-6 pt-6 border-t">
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Mfg Stages</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.manufacturingStageIds.map((id) => {
                    const s = manufacturingStages.find((x) => x.id === id);
                    return s && <Badge key={id} variant="accent">{s.name}</Badge>;
                  })}
                  {detail.manufacturingStageIds.length === 0 && <span className="text-xs text-muted-foreground italic">None</span>}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Asm Stages</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.assemblingStageIds.map((id) => {
                    const s = assemblingStages.find((x) => x.id === id);
                    return s && <Badge key={id} variant="purple">{s.name}</Badge>;
                  })}
                  {detail.assemblingStageIds.length === 0 && <span className="text-xs text-muted-foreground italic">None</span>}
                </div>
              </div>
            </SheetBody>
          </>
        )}
      </Sheet>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        entityName={confirmDel?.name}
        title="Archive product?"
        description="Archived products are hidden but can be restored. To permanently delete, use Delete Forever from the action menu."
        confirmLabel="Archive"
        onConfirm={handleDelete}
      />

      <TypedConfirmDialog
        open={!!typedDel}
        onOpenChange={(o) => !o && setTypedDel(null)}
        title="Permanently delete product?"
        description="This will permanently remove the product and cannot be undone."
        confirmationText={typedDel?.code || ''}
        promptLabel={`Type the product code "${typedDel?.code}" to confirm`}
        onConfirm={async () => {
          if (!typedDel) return;
          const res = deleteProduct(typedDel.id);
          if (!res.success) toast.error(res.error);
          else toast.success(`${typedDel.name} permanently deleted`);
          setTypedDel(null);
        }}
        confirmLabel="Delete forever"
      />
    </PageWrapper>
  );
};
