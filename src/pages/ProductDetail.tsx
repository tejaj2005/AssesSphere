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
import { useData } from '@/context/DataContext';
import { formatDate, nextId } from '@/lib/utils';
import { buildProductFields, PRODUCT_INITIAL_FORM } from '@/lib/productFields';
import type { ProductComponent } from '@/types';

const HASH_TO_TAB: Record<string, string> = { '#mfg': 'mfg', '#asm': 'asm', '#components': 'components', '#overview': 'overview' };

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { products, components, manufacturingStages, assemblingStages, addComponent, updateComponent, deleteComponent, updateProduct } = useData();
  const product = products.find((p) => p.id === id);

  const [tab, setTab] = useState('overview');
  const [compDrawer, setCompDrawer] = useState(false);
  const [editingComp, setEditingComp] = useState<ProductComponent | null>(null);
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compErr, setCompErr] = useState<Record<string, string>>({});
  const [confirmComp, setConfirmComp] = useState<ProductComponent | null>(null);
  const [prodDrawer, setProdDrawer] = useState(false);
  const [prodForm, setProdForm] = useState<any>(PRODUCT_INITIAL_FORM);
  const [prodErrs, setProdErrs] = useState<Record<string, string>>({});

  // Deep-link support: /admin/products/:id#mfg selects the matching tab.
  useEffect(() => {
    const mapped = HASH_TO_TAB[location.hash];
    if (mapped) setTab(mapped);
  }, [location.hash]);

  if (!product) return (
    <PageWrapper>
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">Product not found</h2>
        <Button variant="outline" onClick={() => navigate('/admin/products')} className="mt-4"><ArrowLeft className="h-4 w-4" /> Back to Products</Button>
      </div>
    </PageWrapper>
  );

  const prodComps = components.filter((c) => c.productId === product.id);
  const mfgStages = manufacturingStages.filter((s) => product.manufacturingStageIds.includes(s.id)).sort((a, b) => a.order - b.order);
  const asmStages = assemblingStages.filter((s) => product.assemblingStageIds.includes(s.id)).sort((a, b) => a.order - b.order);

  const openAddComp = () => { setEditingComp(null); setCompName(''); setCompCode(nextId('COMP', components)); setCompErr({}); setCompDrawer(true); };
  const openEditComp = (c: ProductComponent) => { setEditingComp(c); setCompName(c.name); setCompCode(c.code); setCompErr({}); setCompDrawer(true); };

  const submitComp = async () => {
    const e: Record<string, string> = {};
    if (!compName.trim()) e.name = 'Required';
    if (!compCode.trim()) e.code = 'Required';
    setCompErr(e);
    if (Object.keys(e).length) return;
    const res = editingComp ? updateComponent(editingComp.id, { name: compName.trim(), code: compCode.trim() }) : addComponent({ name: compName.trim(), code: compCode.trim(), productId: product.id });
    if (!res.success) { toast.error(res.error); return; }
    toast.success(editingComp ? 'Component updated' : 'Component added');
    setCompDrawer(false);
  };

  const PRODUCT_FIELDS = buildProductFields(manufacturingStages, assemblingStages);

  const openEditProduct = () => {
    if (!product) return;
    setProdForm({ ...PRODUCT_INITIAL_FORM, ...product, status: true });
    setProdErrs({});
    setProdDrawer(true);
  };

  const submitProduct = () => {
    if (!product) return;
    const v = validateConfigForm(PRODUCT_FIELDS, prodForm);
    if (!v.valid) { setProdErrs(v.errors); toast.error('Please fix form errors'); return; }
    const payload: any = { ...prodForm, manufacturingStageIds: prodForm.manufacturingStageIds || [], assemblingStageIds: prodForm.assemblingStageIds || [] };
    const res = updateProduct(product.id, payload);
    if (!res.success) { toast.error(res.error || 'Failed'); return; }
    toast.success('Product updated');
    setProdDrawer(false);
  };

  const compColumns: Column<ProductComponent>[] = [
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
                  <Badge variant={product.status === false || product.status === 'Inactive' ? 'slate' : 'success'}>{product.status === false || product.status === 'Inactive' ? 'Inactive' : 'Active'}</Badge>
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
                  ['Status', product.status === false || product.status === 'Inactive' ? 'Inactive' : 'Active'],
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
              {mfgStages.map((s, i) => (
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
              {asmStages.map((s, i) => (
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
        onConfirm={() => { if (confirmComp) { deleteComponent(confirmComp.id); toast.success('Component deleted'); setConfirmComp(null); } }}
      />
    </PageWrapper>
  );
};
