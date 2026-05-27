import { useState } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { MultiSelectChips, TagChip } from '@/components/shared/MultiSelectChips';
import { InlineEdit } from '@/components/shared/InlineEdit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { formatDate } from '@/lib/utils';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { useData } from '@/context/DataContext';
import { nextId } from '@/lib/utils';
import type { Supplier, SupplierEvalMethod } from '@/types';

export const SuppliersPage = () => {
  const { suppliers, materials, evalMethods, approvedVendors, supplierEvaluations, addSupplier, updateSupplier, deleteSupplier, addEvalMethod, deleteEvalMethod, updateEvalMethod } = useData();
  // Suppliers drawer
  const [supDrawer, setSupDrawer] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const initialSup = { name: '', code: '', materialIds: [] as string[] };
  const [supForm, setSupForm] = useState(initialSup);
  const [supErrs, setSupErrs] = useState<Record<string, string>>({});
  const [confirmSup, setConfirmSup] = useState<Supplier | null>(null);
  const [detailSup, setDetailSup] = useState<Supplier | null>(null);
  // Eval drawer
  const [evalDrawer, setEvalDrawer] = useState(false);
  const [evalForm, setEvalForm] = useState({ name: '', description: '' });
  const [evalErr, setEvalErr] = useState('');
  const [confirmEval, setConfirmEval] = useState<SupplierEvalMethod | null>(null);

  const openAddSup = () => { setEditingSup(null); setSupForm({ ...initialSup, code: nextId('SUP', suppliers) }); setSupErrs({}); setSupDrawer(true); };
  const openEditSup = (s: Supplier) => { setEditingSup(s); setSupForm({ name: s.name, code: s.code, materialIds: s.materialIds }); setSupErrs({}); setSupDrawer(true); };

  const submitSup = async () => {
    const e: Record<string, string> = {};
    if (!supForm.name.trim()) e.name = 'Required';
    if (!supForm.code.trim()) e.code = 'Required';
    setSupErrs(e);
    if (Object.keys(e).length) return;
    const res = editingSup ? updateSupplier(editingSup.id, supForm) : addSupplier(supForm);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(editingSup ? 'Supplier updated' : 'Supplier added');
    setSupDrawer(false);
  };

  const submitEval = async () => {
    if (!evalForm.name.trim()) { setEvalErr('Required'); return; }
    const res = addEvalMethod(evalForm);
    if (!res.success) { setEvalErr(res.error || 'Failed'); toast.error(res.error); return; }
    toast.success('Method added');
    setEvalForm({ name: '', description: '' });
    setEvalDrawer(false);
  };

  const getApproval = (s: Supplier) => {
    const av = approvedVendors.find((v) => v.supplierId === s.id);
    if (av) return av.status === 'APPROVED' ? 'APPROVED' : av.status === 'SUSPENDED' ? 'SUSPENDED' : 'REMOVED';
    return 'NOT_APPROVED';
  };
  const getLatestEval = (s: Supplier) => supplierEvaluations.filter((e) => e.supplierId === s.id).sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate))[0];

  const supColumns: Column<Supplier>[] = [
    { key: 'name', header: 'Supplier', sortable: true, sortValue: (s) => s.name, cell: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'code', header: 'Code', cell: (s) => <span className="text-xs font-mono text-muted-foreground">{s.code}</span> },
    { key: 'approval', header: 'Status', cell: (s) => {
      const st = getApproval(s);
      const variant = st === 'APPROVED' ? 'success' : st === 'SUSPENDED' ? 'warning' : st === 'REMOVED' ? 'danger' : 'slate';
      return <Badge variant={variant}>{st.replace('_', ' ')}</Badge>;
    } },
    { key: 'mats', header: 'Materials', cell: (s) => (
      <div className="flex flex-wrap gap-1 max-w-md">
        {s.materialIds.length === 0 ? <span className="text-xs text-muted-foreground italic">None</span> :
          <>
            {s.materialIds.slice(0, 2).map((id) => { const m = materials.find((x) => x.id === id); return m && <TagChip key={id}>{m.name}</TagChip>; })}
            {s.materialIds.length > 2 && <Badge variant="outline" className="text-[10px]">+{s.materialIds.length - 2}</Badge>}
          </>
        }
      </div>
    ) },
    { key: 'eval', header: 'Latest Eval', cell: (s) => {
      const e = getLatestEval(s);
      if (!e) return <span className="text-xs text-muted-foreground italic">No eval</span>;
      const cls = e.overallStatus === 'GREEN' ? 'success' : e.overallStatus === 'AMBER' ? 'warning' : 'danger';
      return <Badge variant={cls}>{e.overallStatus}</Badge>;
    } },
    { key: 'actions', header: '', width: 'w-12', cell: (s) => (
      <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        <DropdownItem onClick={() => openEditSup(s)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
        <DropdownItem onClick={() => setDetailSup(s)}><Eye className="h-4 w-4" /> View Details</DropdownItem>
        <DropdownItem danger onClick={() => setConfirmSup(s)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
      </Dropdown>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Suppliers & Evaluation"
        description="Manage supplier directory and evaluation methods."
        action={<DataToolbar data={suppliers.map((s) => ({ Name: s.name, Code: s.code, Materials: s.materialIds.map((id) => materials.find((m) => m.id === id)?.name).filter(Boolean).join('; ') }))} filename="pqas-suppliers" />}
      />

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="eval">Evaluation Methods ({evalMethods.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <div className="flex justify-end mb-3">
            <Button variant="accent" onClick={openAddSup}><Plus className="h-4 w-4" /> Add Supplier</Button>
          </div>
          <DataTable columns={supColumns} data={suppliers} emptyTitle="No suppliers" />
        </TabsContent>

        <TabsContent value="eval">
          <div className="flex justify-end mb-3">
            <Button variant="accent" onClick={() => { setEvalForm({ name: '', description: '' }); setEvalErr(''); setEvalDrawer(true); }}><Plus className="h-4 w-4" /> Add Method</Button>
          </div>
          <div className="rounded-xl border bg-card divide-y divide-border">
            {evalMethods.map((m) => (
              <div key={m.id} className="flex items-start justify-between p-4 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {m.isSystem ? <p className="font-medium">{m.name}</p> : <InlineEdit value={m.name} onSave={(v) => { updateEvalMethod(m.id, { name: v }); toast.success('Updated'); }} className="font-medium" />}
                    {m.isSystem && <Badge variant="slate">System</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                </div>
                {!m.isSystem && (
                  <Button variant="ghost" size="icon-sm" onClick={() => setConfirmEval(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                )}
              </div>
            ))}
            {evalMethods.length === 0 && <div className="p-12 text-center text-muted-foreground text-sm">No methods</div>}
          </div>
        </TabsContent>
      </Tabs>

      <FormDrawer open={supDrawer} onOpenChange={setSupDrawer} title={editingSup ? 'Edit Supplier' : 'Add Supplier'} onSubmit={submitSup} submitLabel={editingSup ? 'Update' : 'Create'}>
        <div className="space-y-1.5"><Label>Name <span className="text-destructive">*</span></Label><Input value={supForm.name} error={!!supErrs.name} onChange={(e) => { setSupForm({ ...supForm, name: e.target.value }); setSupErrs({ ...supErrs, name: '' }); }} />{supErrs.name && <p className="text-xs text-destructive">{supErrs.name}</p>}</div>
        <div className="space-y-1.5"><Label>Code <span className="text-destructive">*</span></Label><Input value={supForm.code} error={!!supErrs.code} onChange={(e) => { setSupForm({ ...supForm, code: e.target.value }); setSupErrs({ ...supErrs, code: '' }); }} />{supErrs.code && <p className="text-xs text-destructive">{supErrs.code}</p>}</div>
        <div className="space-y-1.5"><Label>Materials Supplied</Label><MultiSelectChips options={materials.map((m) => ({ label: m.name, value: m.id }))} values={supForm.materialIds} onChange={(v) => setSupForm({ ...supForm, materialIds: v })} /></div>
      </FormDrawer>

      <FormDrawer open={evalDrawer} onOpenChange={setEvalDrawer} title="Add Evaluation Method" onSubmit={submitEval} submitLabel="Add">
        <div className="space-y-1.5"><Label>Name <span className="text-destructive">*</span></Label><Input value={evalForm.name} error={!!evalErr} onChange={(e) => { setEvalForm({ ...evalForm, name: e.target.value }); setEvalErr(''); }} autoFocus />{evalErr && <p className="text-xs text-destructive">{evalErr}</p>}</div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea value={evalForm.description} onChange={(e) => setEvalForm({ ...evalForm, description: e.target.value })} rows={3} /></div>
      </FormDrawer>

      <Sheet open={!!detailSup} onOpenChange={(o) => !o && setDetailSup(null)} className="!w-[600px]">
        {detailSup && (() => {
          const av = approvedVendors.find((v) => v.supplierId === detailSup.id);
          const sevs = supplierEvaluations.filter((e) => e.supplierId === detailSup.id).sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate));
          const supMaterials = materials.filter((m) => detailSup.materialIds.includes(m.id));
          return (
            <>
              <SheetHeader>
                <SheetTitle>{detailSup.name}</SheetTitle>
                <SheetDescription>{detailSup.code}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="space-y-5">
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">Approval Status</p>
                    {av ? (
                      <div className="space-y-2">
                        <Badge variant={av.status === 'APPROVED' ? 'success' : av.status === 'SUSPENDED' ? 'warning' : 'danger'}>{av.status}</Badge>
                        <p className="text-sm">{av.servicesDetails}</p>
                        <p className="text-xs text-muted-foreground">Approved by <span className="font-medium">{av.approvedBy}</span> on {formatDate(av.approvedDate)}</p>
                      </div>
                    ) : (
                      <Badge variant="slate">Not on Approved Vendors list</Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">Materials Supplied ({supMaterials.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {supMaterials.map((m) => <Badge key={m.id} variant="accent">{m.name}</Badge>)}
                      {supMaterials.length === 0 && <p className="text-sm text-muted-foreground italic">None</p>}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">Evaluation History ({sevs.length})</p>
                    {sevs.length === 0 ? <p className="text-sm text-muted-foreground italic">No evaluations recorded</p> : (
                      <div className="space-y-2">
                        {sevs.map((e) => (
                          <div key={e.id} className="p-3 rounded-lg border flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">{formatDate(e.evaluationDate)} · by {e.evaluatedBy}</p>
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                <RAGBadge status={e.qualityStatus} label={`Q ${e.qualityRating}`} />
                                <RAGBadge status={e.deliveryStatus} label={`D ${e.deliveryRating}`} />
                                <RAGBadge status={e.quantityStatus} label={`Qty ${e.quantityRating}`} />
                              </div>
                            </div>
                            <RAGBadge status={e.overallStatus} label="Overall" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">Linked Evaluation Methods</p>
                    <div className="space-y-1">
                      {evalMethods.map((m) => (
                        <div key={m.id} className="p-2 rounded-md border text-xs flex items-center justify-between">
                          <div>
                            <p className="font-medium">{m.name}</p>
                            <p className="text-muted-foreground text-[10px] line-clamp-1">{m.description}</p>
                          </div>
                          {m.isSystem && <Badge variant="slate" className="text-[10px]">System</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetBody>
            </>
          );
        })()}
      </Sheet>

      <ConfirmDialog open={!!confirmSup} onOpenChange={(o) => !o && setConfirmSup(null)} entityName={confirmSup?.name}
        onConfirm={() => { if (confirmSup) { deleteSupplier(confirmSup.id); toast.success('Deleted'); setConfirmSup(null); } }} />
      <ConfirmDialog open={!!confirmEval} onOpenChange={(o) => !o && setConfirmEval(null)} entityName={confirmEval?.name}
        onConfirm={() => { if (confirmEval) { const r = deleteEvalMethod(confirmEval.id); if (r.success) { toast.success('Deleted'); setConfirmEval(null); } else toast.error(r.error); } }} />
    </PageWrapper>
  );
};
