import { useState, useMemo, useEffect } from 'react';
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
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { formatDate, cn } from '@/lib/utils';
import type { RAGStatus } from '@/types';

// Backend shape for /supplier-evaluations (list responses populate refs to objects).
interface PopulatedRef { _id: string; name: string; }
interface ApiSupplierEvaluation {
  _id: string;
  id: string;
  evaluationId?: string;
  supplier: PopulatedRef | string;
  evaluationDate: string;
  evaluatedBy: PopulatedRef | string;
  period: string;
  qualityScore: number;
  deliveryScore: number;
  quantityScore: number;
  communicationScore: number;
  overallScore: number;
  remarks?: string;
  recommendedStatus?: 'MAINTAIN' | 'IMPROVE' | 'SUSPEND' | 'TERMINATE';
  reviewedBy?: PopulatedRef | string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  organization: string;
}

interface SupplierLite { _id: string; name: string; }
interface EvalMethodLite { _id: string; name: string; }

const ratingStatus = (r: number): RAGStatus => r >= 8 ? 'GREEN' : r >= 5 ? 'AMBER' : 'RED';

const periodFromDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
};

const refName = (ref: PopulatedRef | string | undefined, fallback: { _id: string; name: string }[] = []): string => {
  if (!ref) return 'Unknown';
  if (typeof ref === 'object') return ref.name;
  return fallback.find((f) => f._id === ref)?.name || 'Unknown';
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
  const { user } = useAuth();
  const query = user?.organization ? { organization: user.organization } : undefined;
  const { items: supplierEvaluations, loading, create } = useApiResource<ApiSupplierEvaluation>('/supplier-evaluations', query);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>([]);
  const [evalMethods, setEvalMethods] = useState<EvalMethodLite[]>([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState({ supplierId: '', date: new Date().toISOString().slice(0, 10), servicesDetails: '', q: 8, d: 8, qty: 8, comm: 8, methodId: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const qs = user?.organization ? `?organization=${user.organization}` : '';
    api.getList<SupplierLite>(`/admin/suppliers${qs}`).then(({ data }) => setSuppliers(data)).catch(() => {});
    api.getList<EvalMethodLite>(`/admin/supplier-eval-methods${qs}`).then(({ data }) => setEvalMethods(data)).catch(() => {});
  }, [user?.organization]);

  const filtered = useMemo(() => supplierEvaluations.filter((e) => {
    const name = refName(e.supplier, suppliers);
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    if (from && e.evaluationDate < from) return false;
    if (to && e.evaluationDate > to + 'T23:59:59') return false;
    return true;
  }), [supplierEvaluations, suppliers, search, from, to]);

  const submit = async () => {
    if (!form.supplierId) { toast.error('Supplier required'); return; }
    if (!user?.organization) { toast.error('Missing organization context'); return; }
    setBusy(true);
    try {
      // Backend has no dedicated "services details" or "evaluation method" fields on
      // SupplierEvaluation — fold both into the free-text `remarks` field.
      const methodName = evalMethods.find((m) => m._id === form.methodId)?.name;
      const remarks = [form.servicesDetails, methodName ? `Evaluation method: ${methodName}` : ''].filter(Boolean).join(' | ');
      await create({
        organization: user.organization,
        supplier: form.supplierId,
        evaluatedBy: user.id,
        evaluationDate: new Date(form.date).toISOString(),
        period: periodFromDate(form.date),
        qualityScore: form.q,
        deliveryScore: form.d,
        quantityScore: form.qty,
        communicationScore: form.comm,
        remarks,
      });
      toast.success('Evaluation submitted for QM review');
      setDrawer(false);
      setForm({ supplierId: '', date: new Date().toISOString().slice(0, 10), servicesDetails: '', q: 8, d: 8, qty: 8, comm: 8, methodId: '' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const exportRows = filtered.map((e) => ({
    Supplier: refName(e.supplier, suppliers), Date: formatDate(e.evaluationDate),
    Quality: `${e.qualityScore}/10 ${ratingStatus(e.qualityScore)}`, Delivery: `${e.deliveryScore}/10 ${ratingStatus(e.deliveryScore)}`,
    Quantity: `${e.quantityScore}/10 ${ratingStatus(e.quantityScore)}`, Communication: `${e.communicationScore}/10 ${ratingStatus(e.communicationScore)}`,
    Overall: `${e.overallScore}/10 ${ratingStatus(e.overallScore)}`, ReviewStatus: e.reviewStatus,
  }));

  const columns: Column<ApiSupplierEvaluation>[] = [
    { key: 'sup', header: 'Supplier', sortable: true, sortValue: (e) => refName(e.supplier, suppliers), cell: (e) => <span className="font-medium">{refName(e.supplier, suppliers)}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (e) => e.evaluationDate, cell: (e) => <span className="text-xs">{formatDate(e.evaluationDate)}</span> },
    { key: 'q', header: 'Quality', cell: (e) => <RAGBadge status={ratingStatus(e.qualityScore)} label={`${e.qualityScore}/10`} /> },
    { key: 'd', header: 'Delivery', cell: (e) => <RAGBadge status={ratingStatus(e.deliveryScore)} label={`${e.deliveryScore}/10`} /> },
    { key: 'qty', header: 'Quantity', cell: (e) => <RAGBadge status={ratingStatus(e.quantityScore)} label={`${e.quantityScore}/10`} /> },
    { key: 'comm', header: 'Communication', cell: (e) => <RAGBadge status={ratingStatus(e.communicationScore)} label={`${e.communicationScore}/10`} /> },
    { key: 'overall', header: 'Overall', cell: (e) => <RAGBadge status={ratingStatus(e.overallScore)} label={`${e.overallScore}/10`} /> },
    { key: 'review', header: 'QM Review', cell: (e) => <Badge variant={e.reviewStatus === 'APPROVED' ? 'success' : e.reviewStatus === 'REJECTED' ? 'danger' : 'warning'}>{e.reviewStatus}</Badge> },
  ];

  return (
    <PageWrapper>
      <PageHeader title="Supplier Evaluation Reports" description="Quarterly supplier ratings across quality, delivery, quantity and communication." action={
        <>
          <ExportButtons data={exportRows} fileName="supplier-evaluations" />
          <Button variant="accent" onClick={() => setDrawer(true)}><Plus className="h-4 w-4" /> Create Evaluation</Button>
        </>
      } />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} emptyTitle="No evaluations" />

      <Sheet open={drawer} onOpenChange={busy ? () => {} : setDrawer} className="!w-[560px]">
        <SheetHeader>
          <SheetTitle>Create Supplier Evaluation</SheetTitle>
          <SheetDescription>Rate the supplier on quality, delivery, quantity and communication.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Supplier <span className="text-destructive">*</span></Label>
                <Select value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} options={suppliers.map((s) => ({ label: s.name, value: s._id }))} placeholder="Select" />
              </div>
              <div className="space-y-1.5"><Label>Date</Label><DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Services Details</Label><Textarea value={form.servicesDetails} onChange={(e) => setForm({ ...form, servicesDetails: e.target.value })} rows={2} placeholder="What does this supplier provide?" /></div>
            <div className="space-y-1.5"><Label>Evaluation Method</Label>
              <Select value={form.methodId} onChange={(v) => setForm({ ...form, methodId: v })} options={evalMethods.map((m) => ({ label: m.name, value: m._id }))} placeholder="Select method" />
            </div>
            <div className="space-y-5 pt-4 border-t">
              <RatingSlider label="Quality"       value={form.q}    onChange={(v) => setForm({ ...form, q: v })} />
              <RatingSlider label="Delivery"      value={form.d}    onChange={(v) => setForm({ ...form, d: v })} />
              <RatingSlider label="Quantity"      value={form.qty}  onChange={(v) => setForm({ ...form, qty: v })} />
              <RatingSlider label="Communication" value={form.comm} onChange={(v) => setForm({ ...form, comm: v })} />
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
              <span className="text-sm font-medium">Overall Status (average of four)</span>
              <RAGBadge status={ratingStatus((form.q + form.d + form.qty + form.comm) / 4)} />
            </div>
            <p className="text-xs text-muted-foreground">Done by: <span className="font-medium">{user?.name}</span> · Period: <span className="font-medium">{periodFromDate(form.date)}</span></p>
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
