import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2, Package, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { BackButton } from '@/components/shared/BackButton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfigForm, validateConfigForm } from '@/components/shared/ConfigForm';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useApiItem, useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatDate, nextId } from '@/lib/utils';
import { buildProductFields, PRODUCT_INITIAL_FORM } from '@/lib/productFields';

const HASH_TO_TAB: Record<string, string> = { '#mfg': 'mfg', '#asm': 'asm', '#components': 'components', '#overview': 'overview' };

/** Client-side view of a backend Product doc, shaped like the old mock `Product`
 * type so the existing JSX below (written against the mock shape) keeps working
 * almost unchanged. See server/models/Product.ts for the raw shape. */
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

/** Builds the PUT /admin/products/:id payload from the ConfigForm's flat values. */
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

interface ComponentView { id: string; name: string; code: string; }
const toComponentView = (raw: any): ComponentView => ({ id: raw._id, name: raw.name, code: raw.componentId || '' });
const toComponentViews = (raw: any[] | undefined): ComponentView[] => (raw || []).filter(Boolean).map(toComponentView);

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { item: rawProduct, loading, refetch } = useApiItem<any>(id ? `/admin/products/${id}` : null);
  const { items: manufacturingStages } = useApiResource<any>('/admin/manufacturing-stages');
  const { items: assemblingStages } = useApiResource<any>('/admin/assembly-stages');

  const [tab, setTab] = useState('overview');
  const [compDrawer, setCompDrawer] = useState(false);
  const [editingComp, setEditingComp] = useState<ComponentView | null>(null);
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compErr, setCompErr] = useState<Record<string, string>>({});
  const [confirmComp, setConfirmComp] = useState<ComponentView | null>(null);
  const [prodDrawer, setProdDrawer] = useState(false);
  const [prodForm, setProdForm] = useState<any>(PRODUCT_INITIAL_FORM);
  const [prodErrs, setProdErrs] = useState<Record<string, string>>({});

  // Deep-link support: /admin/products/:id#mfg selects the matching tab.
  useEffect(() => {
    const mapped = HASH_TO_TAB[location.hash];
    if (mapped) setTab(mapped);
  }, [location.hash]);

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  if (!rawProduct) return (
    <PageWrapper>
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">Product not found</h2>
        <Button variant="outline" onClick={() => navigate('/admin/products')} className="mt-4"><ArrowLeft className="h-4 w-4" /> Back to Products</Button>
      </div>
    </PageWrapper>
  );

  const product = toView(rawProduct);
  const prodComps: ComponentView[] = toComponentViews(rawProduct.components);
  const mfgStages = manufacturingStages.filter((s: any) => product.manufacturingStageIds.includes(s.id)).sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const asmStages = assemblingStages.filter((s: any) => product.assemblingStageIds.includes(s.id)).sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const openAddComp = () => { setEditingComp(null); setCompName(''); setCompCode(nextId('COMP', prodComps.map((c) => ({ id: c.code })))); setCompErr({}); setCompDrawer(true); };
  const openEditComp = (c: ComponentView) => { setEditingComp(c); setCompName(c.name); setCompCode(c.code); setCompErr({}); setCompDrawer(true); };

  const submitComp = async () => {
    const e: Record<string, string> = {};
    if (!compName.trim()) e.name = 'Required';
    if (!compCode.trim()) e.code = 'Required';
    setCompErr(e);
    if (Object.keys(e).length) return;
    try {
      if (editingComp) {
        // Renaming an existing component doesn't change product membership.
        await api.put(`/admin/components/${editingComp.id}`, { name: compName.trim(), componentId: compCode.trim() });
      } else {
        // Components have no productId on the backend — the relationship is
        // inverted (Product.components holds refs), so create the Component
        // then append its _id to this product's components array.
        const created: any = await api.post('/admin/components', {
          name: compName.trim(),
          componentId: compCode.trim(),
          organization: user?.organization,
        });
        const existingIds = (rawProduct.components || []).filter(Boolean).map((c: any) => c._id);
        await api.put(`/admin/products/${rawProduct.id}`, { components: [...existingIds, created._id] });
      }
      await refetch();
      toast.success(editingComp ? 'Component updated' : 'Component added');
      setCompDrawer(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const PRODUCT_FIELDS = buildProductFields(manufacturingStages, assemblingStages);

  const openEditProduct = () => {
    setProdForm({ ...PRODUCT_INITIAL_FORM, ...product, status: !!product.status });
    setProdErrs({});
    setProdDrawer(true);
  };

  const submitProduct = async () => {
    const v = validateConfigForm(PRODUCT_FIELDS, prodForm);
    if (!v.valid) { setProdErrs(v.errors); toast.error('Please fix form errors'); return; }
    try {
      await api.put(`/admin/products/${rawProduct.id}`, toPayload(prodForm));
      await refetch();
      toast.success('Product updated');
      setProdDrawer(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const compColumns: Column<ComponentView>[] = [
    { key: 'name', header: 'Component', sortable: true, sortValue: (c) => c.name, cell: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'code', header: 'Code', cell: (c) => <span className="text-xs font-mono text-muted-foreground">{c.code}</span> },
    { key: 'actions', header: '', width: 'w-24', cell: (c) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon-sm" onClick={() => openEditComp(c)}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setConfirmComp(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <BackButton to="/admin/products" label="Back to Products" className="mb-4" />

      <Card className="p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
            <Package className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Badge variant="accent" className="font-mono">ID {product.id}</Badge>
                  <Badge variant="outline" className="font-mono">Code {product.code}</Badge>
                  <Badge variant={product.status === false ? 'slate' : 'success'}>{product.status === false ? 'Inactive' : 'Active'}</Badge>
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Created {formatDate(product.createdAt)}</span>
                  {product.updatedAt && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Updated {formatDate(product.updatedAt)}</span>}
                </div>
              </div>
              <Button variant="outline" onClick={openEditProduct}><Pencil className="h-4 w-4" /> Edit Product</Button>
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components ({prodComps.length})</TabsTrigger>
          <TabsTrigger value="mfg">Mfg Stages ({mfgStages.length})</TabsTrigger>
          <TabsTrigger value="asm">Asm Stages ({asmStages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-6 lg:col-span-2">
              <h3 className="font-semibold mb-4">Specifications</h3>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5 text-sm">
                {([
                  ['Category', product.category || '—'],
                  ['Unit of Measure', product.uom || '—'],
                  ['Standard Batch Size', product.batchSize || '—'],
                  ['Shelf Life', product.shelfLife ? `${product.shelfLife} days` : '—'],
                  ['Storage Conditions', product.storageConditions || '—'],
                  ['Regulatory Class', product.regulatoryClass || '—'],
                  ['Drawing / Spec Ref', product.drawingRef || '—'],
                  ['Components', String(prodComps.length)],
                  ['Status', product.status === false ? 'Inactive' : 'Active'],
                ] as [string, any][]).map(([l, v]) => (
                  <div key={l}><dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">{l}</dt><dd className="mt-1 font-medium">{v}</dd></div>
                ))}
              </dl>
              {product.description && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-1.5">Description</p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{product.description}</p>
                </div>
              )}
              {product.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-1.5">Notes</p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{product.notes}</p>
                </div>
              )}
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Traceability</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Calendar className="h-4 w-4" /></div>
                  <div><p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">Created</p><p className="mt-0.5 font-medium">{formatDate(product.createdAt)}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Clock className="h-4 w-4" /></div>
                  <div><p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">Last Updated</p><p className="mt-0.5 font-medium">{product.updatedAt ? formatDate(product.updatedAt) : 'Never modified'}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Package className="h-4 w-4" /></div>
                  <div><p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">Process Coverage</p><p className="mt-0.5 font-medium">{mfgStages.length} mfg · {asmStages.length} asm stages</p></div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components">
          <div className="flex justify-end mb-3">
            <Button variant="accent" size="sm" onClick={openAddComp}><Plus className="h-4 w-4" /> Add Component</Button>
          </div>
          <DataTable columns={compColumns} data={prodComps} emptyTitle="No components" emptyDescription="Add components to this product." />
        </TabsContent>

        <TabsContent value="mfg">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              {mfgStages.map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-accent/5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">{i + 1}</div>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  {i < mfgStages.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
              {mfgStages.length === 0 && <p className="text-sm text-muted-foreground">No manufacturing stages assigned.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="asm">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              {asmStages.map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-purple-500/5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-semibold">{i + 1}</div>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  {i < asmStages.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
              {asmStages.length === 0 && <p className="text-sm text-muted-foreground">No assembling stages assigned.</p>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <FormDrawer
        open={compDrawer} onOpenChange={setCompDrawer}
        title={editingComp ? 'Edit Component' : 'Add Component'}
        onSubmit={submitComp}
        submitLabel={editingComp ? 'Update' : 'Add'}
      >
        <div className="space-y-1.5">
          <Label>Component Name <span className="text-destructive">*</span></Label>
          <Input value={compName} error={!!compErr.name} onChange={(e) => { setCompName(e.target.value); setCompErr({ ...compErr, name: '' }); }} />
          {compErr.name && <p className="text-xs text-destructive">{compErr.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Component Code <span className="text-destructive">*</span></Label>
          <Input value={compCode} error={!!compErr.code} onChange={(e) => { setCompCode(e.target.value); setCompErr({ ...compErr, code: '' }); }} />
          {compErr.code && <p className="text-xs text-destructive">{compErr.code}</p>}
        </div>
      </FormDrawer>

      <Sheet open={prodDrawer} onOpenChange={setProdDrawer} className="!w-[640px]">
        <SheetHeader>
          <SheetTitle>Edit Product</SheetTitle>
          <SheetDescription>Update product configuration, specifications and stages.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <ConfigForm fields={PRODUCT_FIELDS} value={prodForm} onChange={setProdForm} errors={prodErrs} />
        </SheetBody>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="ghost" onClick={() => setProdDrawer(false)}>Cancel</Button>
          <Button variant="accent" onClick={submitProduct}>Update</Button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!confirmComp}
        onOpenChange={(o) => !o && setConfirmComp(null)}
        entityName={confirmComp?.name}
        onConfirm={async () => {
          if (!confirmComp) return;
          try {
            // Detach the component from this product (Component docs have no
            // productId — membership lives only in Product.components).
            const remainingIds = (rawProduct.components || []).filter(Boolean).map((c: any) => c._id).filter((cid: string) => cid !== confirmComp.id);
            await api.put(`/admin/products/${rawProduct.id}`, { components: remainingIds });
            await refetch();
            toast.success('Component deleted');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong');
          }
          setConfirmComp(null);
        }}
      />
    </PageWrapper>
  );
};
