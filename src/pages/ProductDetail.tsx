import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2, Package, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useData } from '@/context/DataContext';
import { formatDate, nextId } from '@/lib/utils';
import type { ProductComponent } from '@/types';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, components, manufacturingStages, assemblingStages, addComponent, updateComponent, deleteComponent } = useData();
  const product = products.find((p) => p.id === id);

  const [compDrawer, setCompDrawer] = useState(false);
  const [editingComp, setEditingComp] = useState<ProductComponent | null>(null);
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compErr, setCompErr] = useState<Record<string, string>>({});
  const [confirmComp, setConfirmComp] = useState<ProductComponent | null>(null);

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
      <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      <Card className="p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
            <Package className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="font-mono">{product.code}</Badge>
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Created {formatDate(product.createdAt)}</span>
                </div>
              </div>
              <Button variant="outline"><Pencil className="h-4 w-4" /> Edit Product</Button>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">Components ({prodComps.length})</TabsTrigger>
          <TabsTrigger value="mfg">Mfg Stages ({mfgStages.length})</TabsTrigger>
          <TabsTrigger value="asm">Asm Stages ({asmStages.length})</TabsTrigger>
        </TabsList>

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

      <ConfirmDialog
        open={!!confirmComp}
        onOpenChange={(o) => !o && setConfirmComp(null)}
        entityName={confirmComp?.name}
        onConfirm={() => { if (confirmComp) { deleteComponent(confirmComp.id); toast.success('Component deleted'); setConfirmComp(null); } }}
      />
    </PageWrapper>
  );
};
