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
import { ConfigForm, validateConfigForm } from '@/components/shared/ConfigForm';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TypedConfirmDialog } from '@/components/shared/TypedConfirmDialog';
import { AuditHistoryDialog } from '@/components/shared/AuditHistoryDialog';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { nextId, cn, formatDate } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { downloadJSON } from '@/lib/exporters';
import { buildProductFields, PRODUCT_INITIAL_FORM } from '@/lib/productFields';

/** Client-side view of a backend Product doc, shaped like the old mock `Product`
 * type so the existing JSX below (which was written against the mock shape)
 * keeps working almost unchanged. See server/models/Product.ts for the raw shape. */
interface ProductView {
  id: string;
  name: string;
  code: string;
  description?: string;
  category?: string;
  uom?: string;
  batchSize?: number | string;
  shelfLife?: number | string;
  storageConditions?: string;
  regulatoryClass?: string;
  drawingRef?: string;
  notes?: string;
  attachments?: string[];
  status: boolean;
  manufacturingStageIds: string[];
  assemblingStageIds: string[];
  componentsCount: number;
  createdAt: string;
  updatedAt?: string;
}

const toView = (raw: any): ProductView => ({
  id: raw.id,
  name: raw.name,
  code: raw.productId || '',
  description: raw.description,
  category: raw.category,
  uom: raw.specifications?.uom,
  batchSize: raw.specifications?.batchSize,
  shelfLife: raw.specifications?.shelfLife,
  storageConditions: raw.specifications?.storageConditions,
  regulatoryClass: raw.specifications?.regulatoryClass,
  drawingRef: raw.specifications?.drawingRef,
  notes: raw.specifications?.notes,
  attachments: raw.specifications?.attachments || [],
  status: raw.status === 'ACTIVE',
  // A referenced stage/component can be deleted elsewhere while still assigned to this
  // product — Mongoose's populate() leaves a `null` in that array slot rather than removing
  // it, so dangling refs must be filtered out before mapping or this throws on every render.
  manufacturingStageIds: (raw.manufacturingStages || []).filter(Boolean).map((s: any) => (typeof s === 'string' ? s : s._id)),
  assemblingStageIds: (raw.assemblyStages || []).filter(Boolean).map((s: any) => (typeof s === 'string' ? s : s._id)),
  componentsCount: Array.isArray(raw.components) ? raw.components.filter(Boolean).length : 0,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

/** Builds the create/update payload for POST/PUT /admin/products from the ConfigForm's flat values. */
const toPayload = (form: any) => ({
  name: form.name,
  productId: form.code || undefined,
  description: form.description || undefined,
  category: form.category || undefined,
  specifications: {
    uom: form.uom, batchSize: form.batchSize, shelfLife: form.shelfLife,
    storageConditions: form.storageConditions, regulatoryClass: form.regulatoryClass,
    drawingRef: form.drawingRef, notes: form.notes, attachments: form.attachments || [],
  },
  manufacturingStages: form.manufacturingStageIds || [],
  assemblyStages: form.assemblingStageIds || [],
  status: form.status === false ? 'DISCONTINUED' : 'ACTIVE',
});

export const ProductsPage = () => {
  const { items: rawProducts, loading, create, update, remove } = useApiResource<any>('/admin/products');
  const { items: manufacturingStages } = useApiResource<any>('/admin/manufacturing-stages');
  const { items: assemblingStages } = useApiResource<any>('/admin/assembly-stages');
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductView | null>(null);
  const [confirmDel, setConfirmDel] = useState<ProductView | null>(null);
  const [typedDel, setTypedDel] = useState<ProductView | null>(null);
  const [detail, setDetail] = useState<ProductView | null>(null);
  const [history, setHistory] = useState<ProductView | null>(null);
  const [form, setForm] = useState<any>(PRODUCT_INITIAL_FORM);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const canEdit = hasPermission('Products', 'edit');
  const canDelete = hasPermission('Products', 'delete');
  const canCreate = hasPermission('Products', 'create');

  const products = useMemo(() => rawProducts.map(toView), [rawProducts]);

  const PRODUCT_FIELDS = buildProductFields(manufacturingStages, assemblingStages);

  const filtered = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())), [products, search]);

  const openAdd = () => { setEditing(null); setForm({ ...PRODUCT_INITIAL_FORM, code: nextId('PROD', products.map((p) => ({ id: p.code }))) }); setErrs({}); setDrawerOpen(true); };
  const openEdit = (p: ProductView) => { setEditing(p); setForm({ ...PRODUCT_INITIAL_FORM, ...p, status: !!p.status }); setErrs({}); setDrawerOpen(true); };

  const submit = async () => {
    const v = validateConfigForm(PRODUCT_FIELDS, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix form errors'); return; }
    try {
      if (editing) {
        await update(editing.id, toPayload(form));
      } else {
        await create({ ...toPayload(form), organization: user?.organization });
      }
      toast.success(editing ? 'Product updated' : 'Product created');
      setDrawerOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const cloneProduct = async (p: ProductView) => {
    try {
      await create({
        ...toPayload(p),
        name: `${p.name} (Copy)`,
        productId: `${p.code}-COPY-${Date.now().toString().slice(-3)}`,
        organization: user?.organization,
      });
      toast.success(`Cloned ${p.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Clone failed');
    }
  };

  // A real soft delete: flips status to DISCONTINUED instead of removing the document, so
  // "Archive" actually matches what its confirmation dialog promises (hidden, restorable via
  // Edit Product) instead of silently performing the same permanent DELETE as "Delete Forever".
  const archiveProduct = async (p: ProductView) => {
    try {
      await update(p.id, { status: 'DISCONTINUED' });
      toast.success(`${p.name} archived`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
    setConfirmDel(null);
  };

  const actionsFor = (p: ProductView) => [
    { label: 'View Details',     icon: Eye,       onClick: () => navigate(`/admin/products/${p.id}`) },
    { label: 'Quick Look',       icon: Package,   onClick: () => setDetail(p) },
    { label: 'Edit Product',     icon: Pencil,    onClick: () => openEdit(p), show: canEdit, separatorBefore: true },
    { label: 'Clone Product',    icon: Copy,      onClick: () => cloneProduct(p), show: canCreate },
    { label: 'Manage Components',icon: Puzzle,    onClick: () => navigate(`/admin/components?product=${p.id}`), separatorBefore: true },
    { label: 'View MFG Stages',  icon: SettingsIcon, onClick: () => navigate(`/admin/products/${p.id}#mfg`) },
    { label: 'View ASM Stages',  icon: Wrench,    onClick: () => navigate(`/admin/products/${p.id}#asm`) },
    { label: 'Export to JSON',   icon: FileDown,  onClick: () => { downloadJSON(p.code, p); toast.success('Exported'); }, separatorBefore: true },
    { label: 'View History',     icon: History,   onClick: () => setHistory(p) },
    { label: 'Archive Product',  icon: Archive,   onClick: () => setConfirmDel(p), show: canEdit },
    { label: 'Delete Forever',   icon: Trash2,    onClick: () => setTypedDel(p), danger: true, show: canDelete, separatorBefore: true },
  ];

  const columns: Column<ProductView>[] = [
    { key: 'name', header: 'Product', sortable: true, sortValue: (p) => p.name, cell: (p) => <Link to={`/admin/products/${p.id}`} className="font-medium hover:text-accent">{p.name}</Link> },
    { key: 'code', header: 'Code', sortable: true, sortValue: (p) => p.code, cell: (p) => <span className="text-xs font-mono text-muted-foreground">{p.code}</span> },
    { key: 'comps', header: 'Components', cell: (p) => <Badge variant="outline">{p.componentsCount}</Badge> },
    { key: 'mfg', header: 'Mfg Stages', cell: (p) => <Badge variant="accent">{p.manufacturingStageIds.length}</Badge> },
    { key: 'asm', header: 'Asm Stages', cell: (p) => <Badge variant="purple">{p.assemblingStageIds.length}</Badge> },
    { key: 'status', header: 'Status', cell: (p) => (
      <Badge variant={p.status === false ? 'slate' : 'success'}>{p.status === false ? 'Inactive' : 'Active'}</Badge>
    ) },
    { key: 'actions', header: '', width: 'w-12', cell: (p) => <ActionMenu actions={actionsFor(p)} /> },
  ];

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

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
            <DataToolbar data={products.map((p) => ({ Name: p.name, Code: p.code, Components: p.componentsCount, MfgStages: p.manufacturingStageIds.length, AsmStages: p.assemblingStageIds.length }))} filename="pqas-products" />
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
                  <div className="flex items-center gap-1.5">
                    <Badge variant="accent" className="font-mono text-xs">{p.code}</Badge>
                    <ActionMenu actions={actionsFor(p)} />
                  </div>
                </div>
                <h3 className="font-semibold mb-1">{p.name}</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 text-xs text-muted-foreground">
                  <span>Code <span className="font-mono text-foreground">{p.code}</span></span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{p.componentsCount} components</span>
                </div>
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
              {detail.description && <p className="text-sm text-muted-foreground mb-5">{detail.description}</p>}
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {([
                  ['Code', detail.code],
                  ['Status', detail.status === false ? 'Inactive' : 'Active'],
                  ['Category', detail.category || '—'], ['UoM', detail.uom || '—'],
                  ['Batch Size', detail.batchSize || '—'], ['Shelf Life', detail.shelfLife ? `${detail.shelfLife} days` : '—'],
                  ['Storage', detail.storageConditions || '—'], ['Regulatory Class', detail.regulatoryClass || '—'],
                  ['Drawing Ref', detail.drawingRef || '—'], ['Components', String(detail.componentsCount)],
                  ['Created', formatDate(detail.createdAt)], ['Updated', detail.updatedAt ? formatDate(detail.updatedAt) : '—'],
                ] as [string, any][]).map(([l, v]) => (
                  <div key={l}><dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">{l}</dt><dd className="mt-1">{v}</dd></div>
                ))}
              </dl>
              {detail.notes && <div className="mt-4 pt-4 border-t"><dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-1">Notes</dt><dd className="text-sm">{detail.notes}</dd></div>}
              <div className="mt-5 flex gap-2">
                <Button variant="accent" size="sm" onClick={() => { const d = detail; setDetail(null); navigate(`/admin/products/${d.id}`); }}>Open full view</Button>
                {canEdit && <Button variant="outline" size="sm" onClick={() => { const d = detail; setDetail(null); openEdit(d); }}><Pencil className="h-4 w-4" /> Edit</Button>}
              </div>
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
        description="Archived products are marked discontinued and hidden from active use, but can be restored any time from Edit Product. To permanently delete, use Delete Forever from the action menu."
        confirmLabel="Archive"
        onConfirm={() => { if (confirmDel) archiveProduct(confirmDel); }}
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
          try {
            await remove(typedDel.id);
            toast.success(`${typedDel.name} permanently deleted`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Something went wrong');
          }
          setTypedDel(null);
        }}
        confirmLabel="Delete forever"
      />

      <AuditHistoryDialog open={!!history} onOpenChange={(o) => !o && setHistory(null)} entityType="Product" entityName={history?.name} />
    </PageWrapper>
  );
};
