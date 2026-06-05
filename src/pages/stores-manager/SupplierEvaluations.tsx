import { useState, useMemo } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { formatDate, cn } from '@/lib/utils';
import type { RAGStatus, SupplierEvaluation } from '@/types';

const ratingStatus = (r: number): RAGStatus => r >= 8 ? 'GREEN' : r >= 5 ? 'AMBER' : 'RED';
const overallFrom = (q: RAGStatus, d: RAGStatus, qty: RAGStatus): RAGStatus => {
  if ([q, d, qty].includes('RED')) return 'RED';
  if ([q, d, qty].includes('AMBER')) return 'AMBER';
  return 'GREEN';
};

const RatingSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => {
  const status = ratingStatus(value);
  const color = status === 'GREEN' ? 'bg-emerald-500' : status === 'AMBER' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label} Rating</Label>
        <div className="flex items-center gap-2"><span className="text-2xl font-bold tabular-nums">{value}</span><span className="text-sm text-muted-foreground">/10</span><RAGBadge status={status} /></div>
      </div>
      <input type="range" min={1} max={10} step={1} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className={cn('w-full h-2 rounded-lg appearance-none cursor-pointer', color)} />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Red (1-4)</span><span>Amber (5-7)</span><span>Green (8-10)</span>
      </div>
    </div>
  );
};

export const SupplierEvaluations = () => {
  const { suppliers, supplierEvaluations, evalMethods, addSupplierEvaluation } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState({ supplierId: '', date: new Date().toISOString().slice(0, 10), servicesDetails: '', q: 8, d: 8, qty: 8, methodId: '' });
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => supplierEvaluations.filter((e) => {
    if (search && !e.supplierName.toLowerCase().includes(search.toLowerCase())) return false;
    if (from && e.evaluationDate < from) return false;
    if (to && e.evaluationDate > to + 'T23:59:59') return false;
    return true;
  }), [supplierEvaluations, search, from, to]);

  const submit = async () => {
    if (!form.supplierId) { toast.error('Supplier required'); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    const sup = suppliers.find((s) => s.id === form.supplierId)!;
    const qs = ratingStatus(form.q), ds = ratingStatus(form.d), qts = ratingStatus(form.qty);
    addSupplierEvaluation({
      supplierId: sup.id, supplierName: sup.name, evaluationDate: new Date(form.date).toISOString(),
      qualityRating: form.q, deliveryRating: form.d, quantityRating: form.qty,
      qualityStatus: qs, deliveryStatus: ds, quantityStatus: qts, overallStatus: overallFrom(qs, ds, qts),
      evaluatedBy: user?.name || 'Stores Manager', approvalStatus: 'PENDING', servicesDetails: form.servicesDetails,
    });
    setBusy(false);
    toast.success('Evaluation submitted for QM review');
    setDrawer(false);
    setForm({ supplierId: '', date: new Date().toISOString().slice(0, 10), servicesDetails: '', q: 8, d: 8, qty: 8, methodId: '' });
  };

  const exportRows = filtered.map((e) => ({ Supplier: e.supplierName, Date: formatDate(e.evaluationDate), Quality: `${e.qualityRating}/10 ${e.qualityStatus}`, Delivery: `${e.deliveryRating}/10 ${e.deliveryStatus}`, Quantity: `${e.quantityRating}/10 ${e.quantityStatus}`, Overall: e.overallStatus, ReviewStatus: e.approvalStatus }));

  const columns: Column<SupplierEvaluation>[] = [
    { key: 'sup', header: 'Supplier', sortable: true, sortValue: (e) => e.supplierName, cell: (e) => <span className="font-medium">{e.supplierName}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (e) => e.evaluationDate, cell: (e) => <span className="text-xs">{formatDate(e.evaluationDate)}</span> },
    { key: 'q', header: 'Quality', cell: (e) => <RAGBadge status={e.qualityStatus} label={`${e.qualityRating}/10`} /> },
    { key: 'd', header: 'Delivery', cell: (e) => <RAGBadge status={e.deliveryStatus} label={`${e.deliveryRating}/10`} /> },
    { key: 'qty', header: 'Quantity', cell: (e) => <RAGBadge status={e.quantityStatus} label={`${e.quantityRating}/10`} /> },
    { key: 'overall', header: 'Overall', cell: (e) => <RAGBadge status={e.overallStatus} /> },
    { key: 'review', header: 'QM Review', cell: (e) => <Badge variant={e.approvalStatus === 'APPROVED' ? 'success' : e.approvalStatus === 'REJECTED' ? 'danger' : 'warning'}>{e.approvalStatus}</Badge> },
  ];

  return (
    <PageWrapper>
      <PageHeader title="Supplier Evaluation Reports" description="Quarterly supplier ratings across quality, delivery and quantity." action={
        <>
          <ExportButtons data={exportRows} fileName="supplier-evaluations" />
          <Button variant="accent" onClick={() => setDrawer(true)}><Plus className="h-4 w-4" /> Create Evaluation</Button>
        </>
      } />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>
      <DataTable columns={columns} data={filtered} emptyTitle="No evaluations" />

      <Sheet open={drawer} onOpenChange={busy ? () => {} : setDrawer} className="!w-[560px]">
        <SheetHeader>
          <SheetTitle>Create Supplier Evaluation</SheetTitle>
          <SheetDescription>Rate the supplier on quality, delivery and quantity.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Supplier <span className="text-destructive">*</span></Label>
                <Select value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} options={suppliers.map((s) => ({ label: s.name, value: s.id }))} placeholder="Select" />
              </div>
              <div className="space-y-1.5"><Label>Date</Label><DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Services Details</Label><Textarea value={form.servicesDetails} onChange={(e) => setForm({ ...form, servicesDetails: e.target.value })} rows={2} placeholder="What does this supplier provide?" /></div>
            <div className="space-y-1.5"><Label>Evaluation Method</Label>
              <Select value={form.methodId} onChange={(v) => setForm({ ...form, methodId: v })} options={evalMethods.map((m) => ({ label: m.name, value: m.id }))} placeholder="Select method" />
            </div>
            <div className="space-y-5 pt-4 border-t">
              <RatingSlider label="Quality"  value={form.q}   onChange={(v) => setForm({ ...form, q: v })} />
              <RatingSlider label="Delivery" value={form.d}   onChange={(v) => setForm({ ...form, d: v })} />
              <RatingSlider label="Quantity" value={form.qty} onChange={(v) => setForm({ ...form, qty: v })} />
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
              <span className="text-sm font-medium">Overall Status (lowest of three)</span>
              <RAGBadge status={overallFrom(ratingStatus(form.q), ratingStatus(form.d), ratingStatus(form.qty))} />
            </div>
            <p className="text-xs text-muted-foreground">Done by: <span className="font-medium">{user?.name}</span></p>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setDrawer(false)} disabled={busy}>Cancel</Button>
          <Button variant="accent" onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit for QM Review</Button>
        </SheetFooter>
      </Sheet>
    </PageWrapper>
  );
};
