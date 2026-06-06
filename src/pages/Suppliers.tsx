import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, Star, Mail, Phone, MapPin, Building2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TagChip } from '@/components/shared/MultiSelectChips';
import { ConfigForm } from '@/components/shared/ConfigForm';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { supplierFields } from '@/lib/entityFields';
import { InlineEdit } from '@/components/shared/InlineEdit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { formatDate } from '@/lib/utils';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { useData } from '@/context/DataContext';
import { nextId } from '@/lib/utils';
import type { Supplier, SupplierEvalMethod } from '@/types';

const APPROVAL_VARIANT: Record<string, any> = { APPROVED: 'success', SUSPENDED: 'warning', REMOVED: 'danger', NOT_APPROVED: 'slate' };
const COUNTRY_LABEL: Record<string, string> = { IN: 'India', US: 'United States', DE: 'Germany', JP: 'Japan', CN: 'China', SG: 'Singapore' };
// Maps a supplier's latest evaluation RAG status to a method-application verdict.
const EVAL_VERDICT: Record<string, { label: string; variant: string }> = {
  GREEN: { label: 'Passed', variant: 'success' }, AMBER: { label: 'Watch', variant: 'warning' }, RED: { label: 'Failed', variant: 'danger' },
};

export const SuppliersPage = () => {
  const { suppliers, materials, evalMethods, approvedVendors, supplierEvaluations, addSupplier, updateSupplier, deleteSupplier, addEvalMethod, deleteEvalMethod, updateEvalMethod } = useData();
  // Suppliers drawer
  const [supDrawer, setSupDrawer] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const initialSup: any = { name: '', code: '', materialIds: [], supplierCategory: 'APPROVED', country: 'IN', contactPerson: '', email: '', phone: '', paymentTerms: '', address: '', certification: '', leadTime: '', rating: 4, status: true, attachments: [], notes: '' };
  const [supForm, setSupForm] = useState<any>(initialSup);
  const [supErrs, setSupErrs] = useState<Record<string, string>>({});
  const [confirmSup, setConfirmSup] = useState<Supplier | null>(null);
  const [detailSup, setDetailSup] = useState<Supplier | null>(null);
  // Eval drawer
  const [evalDrawer, setEvalDrawer] = useState(false);
  const [evalForm, setEvalForm] = useState({ name: '', description: '' });
  const [evalErr, setEvalErr] = useState('');
  const [confirmEval, setConfirmEval] = useState<SupplierEvalMethod | null>(null);
  const [approvalFilter, setApprovalFilter] = useState('all');

  const openAddSup = () => { setEditingSup(null); setSupForm({ ...initialSup, code: nextId('SUP', suppliers) }); setSupErrs({}); setSupDrawer(true); };
  const openEditSup = (s: Supplier) => { setEditingSup(s); setSupForm({ ...initialSup, ...s }); setSupErrs({}); setSupDrawer(true); };

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

  const filteredSuppliers = useMemo(
    () => (approvalFilter === 'all' ? suppliers : suppliers.filter((s) => getApproval(s) === approvalFilter)),
    [suppliers, approvalFilter, approvedVendors],
  );
  const approvalCounts = useMemo(() => {
    const c: Record<string, number> = { APPROVED: 0, NOT_APPROVED: 0, SUSPENDED: 0, REMOVED: 0 };
    suppliers.forEach((s) => { const k = getApproval(s); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [suppliers, approvedVendors]);

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
      <ActionMenu actions={[
        { label: 'View Details', icon: Eye, onClick: () => setDetailSup(s) },
        { label: 'Edit Supplier', icon: Pencil, onClick: () => openEditSup(s), separatorBefore: true },
        { label: 'Delete Supplier', icon: Trash2, onClick: () => setConfirmSup(s), danger: true, separatorBefore: true },
      ]} />
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
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Select
              value={approvalFilter}
              onChange={setApprovalFilter}
              className="sm:w-56"
              options={[
                { label: `All Suppliers (${suppliers.length})`, value: 'all' },
                { label: `Approved (${approvalCounts.APPROVED})`, value: 'APPROVED' },
                { label: `Not Approved (${approvalCounts.NOT_APPROVED})`, value: 'NOT_APPROVED' },
                { label: `Suspended (${approvalCounts.SUSPENDED})`, value: 'SUSPENDED' },
                { label: `Removed (${approvalCounts.REMOVED})`, value: 'REMOVED' },
              ]}
            />
            <Button variant="accent" className="ml-auto" onClick={openAddSup}><Plus className="h-4 w-4" /> Add Supplier</Button>
          </div>
          <DataTable columns={supColumns} data={filteredSuppliers} onRowClick={(s) => setDetailSup(s)} emptyTitle="No suppliers" emptyDescription={approvalFilter !== 'all' ? 'No suppliers with this status.' : 'Add a supplier to get started.'} />
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
        <ConfigForm fields={supplierFields(materials)} value={supForm} onChange={setSupForm} errors={supErrs} />
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
          const approval = getApproval(detailSup);
          const isApproved = approval === 'APPROVED';
          const latest = sevs[0];
          const contactRows: [string, any, any][] = [
            ['Contact Person', detailSup.contactPerson, Building2],
            ['Email', detailSup.email, Mail],
            ['Phone', detailSup.phone, Phone],
            ['Country', detailSup.country ? (COUNTRY_LABEL[detailSup.country] || detailSup.country) : '', MapPin],
          ];
          return (
            <>
              <SheetHeader>
                <SheetTitle>{detailSup.name}</SheetTitle>
                <SheetDescription>{detailSup.code}{detailSup.certification ? ` · ${detailSup.certification}` : ''}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={APPROVAL_VARIANT[approval]}>{approval.replace('_', ' ')}</Badge>
                    {typeof detailSup.rating === 'number' && (
                      <span className="inline-flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-[#f5af12] text-[#f5af12]" />{detailSup.rating}/5</span>
                    )}
                    {detailSup.leadTime !== undefined && detailSup.leadTime !== '' && <Badge variant="outline">Lead time {detailSup.leadTime} days</Badge>}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">Supplier Information</p>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      {contactRows.map(([label, val, Icon]) => (
                        <div key={label} className="flex items-start gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0"><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="truncate">{val || '—'}</dd></div>
                        </div>
                      ))}
                    </dl>
                    {(detailSup.paymentTerms || detailSup.address) && (
                      <dl className="grid grid-cols-1 gap-2 text-sm mt-3">
                        {detailSup.paymentTerms && <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Payment Terms</dt><dd>{detailSup.paymentTerms}</dd></div>}
                        {detailSup.address && <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Address</dt><dd>{detailSup.address}</dd></div>}
                      </dl>
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-muted-foreground">
                      {detailSup.createdAt && <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Added {formatDate(detailSup.createdAt)}</span>}
                      {detailSup.updatedAt && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Updated {formatDate(detailSup.updatedAt)}</span>}
                    </div>
                  </div>

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
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Evaluation Methods</p>
                      {isApproved
                        ? <Badge variant={latest ? (EVAL_VERDICT[latest.overallStatus]?.variant as any) : 'slate'}>{latest ? `${EVAL_VERDICT[latest.overallStatus]?.label} · ${formatDate(latest.evaluationDate)}` : 'Awaiting evaluation'}</Badge>
                        : <Badge variant="slate">Not applicable until approved</Badge>}
                    </div>
                    <div className="space-y-1">
                      {evalMethods.map((m) => {
                        // Methods apply to approved suppliers; the per-method verdict mirrors the
                        // supplier's latest overall evaluation status (or "Pending" if none yet).
                        const verdict = !isApproved ? null : latest ? EVAL_VERDICT[latest.overallStatus] : { label: 'Pending', variant: 'warning' };
                        return (
                          <div key={m.id} className="p-2.5 rounded-md border text-xs flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{m.name}</p>
                              <p className="text-muted-foreground text-[10px] line-clamp-1">{m.description}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {m.isSystem && <Badge variant="slate" className="text-[10px]">System</Badge>}
                              {verdict
                                ? <Badge variant={verdict.variant as any} className="text-[10px]">{verdict.label}</Badge>
                                : <Badge variant="outline" className="text-[10px]">N/A</Badge>}
                            </div>
                          </div>
                        );
                      })}
                      {evalMethods.length === 0 && <p className="text-sm text-muted-foreground italic">No evaluation methods defined</p>}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { const s = detailSup; setDetailSup(null); openEditSup(s); }}><Pencil className="h-4 w-4" /> Edit Supplier</Button>
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
