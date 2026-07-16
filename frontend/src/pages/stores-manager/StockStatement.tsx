import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';

/**
 * MaterialStockStatement has no backend model. This page derives an
 * approximate stock statement client-side from live Materials +
 * R1_MATERIAL InspectionPlans/InspectionReports:
 *  - InspectionPlan (planType=R1_MATERIAL) links a Material to its reports.
 *  - InspectionReport.status on those reports is bucketed into
 *    approved / rejected / pending counts (1 report ≈ 1 received batch —
 *    there is no quantity field on the backend to sum instead).
 * The resulting rows are a one-time snapshot seeded into local state; the
 * "Create Statement" / delete actions only manipulate that local list
 * (nothing is persisted server-side), matching the read-only nature of the
 * data available.
 */
interface StockRow {
  id: string;
  date: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  totalAvailable: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  category: string;
  preparedBy: string;
  unit: string;
}

const PENDING_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'];

export const StockStatement = () => {
  const { user } = useAuth();

  const materialsQuery = useMemo(
    () => (user?.organization ? { organization: user.organization } : undefined),
    [user?.organization]
  );
  const plansQuery = useMemo(
    () => ({ ...(user?.organization ? { organization: user.organization } : {}), planType: 'R1_MATERIAL', limit: '200' }),
    [user?.organization]
  );
  const reportsQuery = useMemo(
    () => ({ ...(user?.organization ? { organization: user.organization } : {}), limit: '200' }),
    [user?.organization]
  );

  const { items: materials, loading: materialsLoading } = useApiResource<any>('/admin/materials', materialsQuery);
  const { items: plans, loading: plansLoading } = useApiResource<any>('/inspection-plans', plansQuery);
  const { items: reports, loading: reportsLoading } = useApiResource<any>('/inspection-reports', reportsQuery);

  const loading = materialsLoading || plansLoading || reportsLoading;

  // materialId (_id) -> approved/rejected/pending counts, derived from R1_MATERIAL reports
  const countsByMaterial = useMemo(() => {
    const planMaterialMap = new Map<string, string>();
    plans.forEach((p: any) => {
      const matId = typeof p.material === 'object' && p.material ? p.material._id : p.material;
      if (matId) planMaterialMap.set(p._id, matId);
    });
    const map = new Map<string, { approved: number; rejected: number; pending: number }>();
    reports.forEach((r: any) => {
      const planId = typeof r.plan === 'object' && r.plan ? r.plan._id : r.plan;
      const materialId = planId ? planMaterialMap.get(planId) : undefined;
      if (!materialId) return; // not a material-inspection report
      const bucket = map.get(materialId) || { approved: 0, rejected: 0, pending: 0 };
      if (r.status === 'APPROVED') bucket.approved += 1;
      else if (r.status === 'REJECTED') bucket.rejected += 1;
      else if (PENDING_STATUSES.includes(r.status)) bucket.pending += 1;
      map.set(materialId, bucket);
    });
    return map;
  }, [plans, reports]);

  const [rows, setRows] = useState<StockRow[]>([]);
  const [seeded, setSeeded] = useState(false);

  // One-time client-side snapshot, seeded once all three sources have loaded.
  useEffect(() => {
    if (loading || seeded) return;
    const derived: StockRow[] = materials.map((m: any) => {
      const counts = countsByMaterial.get(m._id) || { approved: 0, rejected: 0, pending: 0 };
      const typeName = typeof m.materialType === 'object' && m.materialType ? m.materialType.name : undefined;
      return {
        id: m._id,
        date: new Date().toISOString(),
        materialId: m._id,
        materialName: m.name,
        materialCode: m.materialId,
        totalAvailable: counts.approved + counts.rejected + counts.pending,
        approvedCount: counts.approved,
        rejectedCount: counts.rejected,
        pendingCount: counts.pending,
        category: typeName || 'Raw Material',
        preparedBy: user?.name || 'SM',
        unit: m.unit || 'units',
      };
    });
    setRows(derived);
    setSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, seeded]);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState({ materialId: '', approved: 0, rejected: 0, pending: 0 });
  const [confirmDel, setConfirmDel] = useState<StockRow | null>(null);

  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    materials.forEach((m: any) => {
      const n = typeof m.materialType === 'object' && m.materialType ? m.materialType.name : undefined;
      if (n) names.add(n);
    });
    return Array.from(names);
  }, [materials]);

  const filtered = useMemo(() => rows.filter((s) => {
    if (search && !s.materialName.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== 'all' && s.category !== catFilter) return false;
    return true;
  }), [rows, search, catFilter]);

  // When material selected, prefill from derived approved/rejected/pending counts
  const onMatChange = (id: string) => {
    const counts = countsByMaterial.get(id) || { approved: 0, rejected: 0, pending: 0 };
    setForm({ materialId: id, approved: counts.approved, rejected: counts.rejected, pending: counts.pending });
  };

  const submit = () => {
    if (!form.materialId) { toast.error('Material required'); return; }
    const mat = materials.find((m: any) => m._id === form.materialId);
    if (!mat) { toast.error('Material not found'); return; }
    const typeName = typeof mat.materialType === 'object' && mat.materialType ? mat.materialType.name : undefined;
    const newRow: StockRow = {
      id: `${mat._id}-${Date.now()}`,
      date: new Date().toISOString(),
      materialId: mat._id,
      materialName: mat.name,
      materialCode: mat.materialId,
      totalAvailable: form.approved + form.rejected + form.pending,
      approvedCount: form.approved,
      rejectedCount: form.rejected,
      pendingCount: form.pending,
      category: typeName || 'Raw Material',
      preparedBy: user?.name || 'SM',
      unit: mat.unit || 'units',
    };
    setRows((prev) => [newRow, ...prev]);
    // Not persisted anywhere (see file header) — say so, rather than a plain "created" that
    // implies this survives a refresh or another visit to the page.
    toast.success('Added to this view — not saved, will reset on refresh');
    setDrawer(false);
    setForm({ materialId: '', approved: 0, rejected: 0, pending: 0 });
  };

  const exportRows = filtered.map((s) => ({ Date: formatDate(s.date), Material: s.materialName, Code: s.materialCode, Total: s.totalAvailable, Approved: s.approvedCount, Rejected: s.rejectedCount, Pending: s.pendingCount, Category: s.category, PreparedBy: s.preparedBy, Unit: s.unit }));

  return (
    <PageWrapper>
      <PageHeader title="Material Stock Statement" description="Track approved, rejected and pending inventory per material." action={
        <>
          <ExportButtons data={exportRows} fileName="stock-statement" />
          <Button variant="accent" onClick={() => setDrawer(true)}><Plus className="h-4 w-4" /> Create Statement</Button>
        </>
      } />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search material…" className="sm:w-72" />
        <Select value={catFilter} onChange={setCatFilter} options={[{ label: 'All Categories', value: 'all' }, ...categoryOptions.map((n) => ({ label: n, value: n }))]} className="w-48" />
      </div>

      <Card className="overflow-hidden print-area">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Material</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Approved</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Rejected</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Prepared By</th>
                <th className="w-12 px-4 py-3 no-print"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && !seeded ? (
                <tr><td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">Loading stock statement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">No stock statements yet</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs">{formatDate(s.date)}</td>
                  <td className="px-4 py-3 font-medium">{s.materialName}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{s.materialCode}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{s.totalAvailable}</td>
                  <td className={cn('px-4 py-3 text-right font-mono font-medium bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400')}>{s.approvedCount}</td>
                  <td className={cn('px-4 py-3 text-right font-mono font-medium bg-red-50/50 dark:bg-red-500/5 text-red-700 dark:text-red-400')}>{s.rejectedCount}</td>
                  <td className={cn('px-4 py-3 text-right font-mono font-medium bg-amber-50/50 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400')}>{s.pendingCount}</td>
                  <td className="px-4 py-3 text-xs">{s.category}</td>
                  <td className="px-4 py-3 text-xs">{s.preparedBy}</td>
                  <td className="px-4 py-3 no-print"><Button variant="ghost" size="icon-sm" onClick={() => setConfirmDel(s)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetHeader><SheetTitle>Create Stock Statement</SheetTitle><SheetDescription>Quantities auto-fill from inspection data; adjust if needed. This view isn't backed by a database table yet, so entries here only last for this visit to the page.</SheetDescription></SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Material <span className="text-destructive">*</span></Label>
              <Select value={form.materialId} onChange={onMatChange} options={materials.map((m: any) => ({ label: m.name, value: m._id }))} placeholder="Select material" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Approved</Label><Input type="number" value={form.approved || ''} onChange={(e) => setForm({ ...form, approved: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-1.5"><Label>Rejected</Label><Input type="number" value={form.rejected || ''} onChange={(e) => setForm({ ...form, rejected: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-1.5"><Label>Pending</Label><Input type="number" value={form.pending || ''} onChange={(e) => setForm({ ...form, pending: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 text-sm flex items-center justify-between">
              <span>Total Available</span>
              <span className="font-mono font-semibold">{form.approved + form.rejected + form.pending}</span>
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setDrawer(false)}>Cancel</Button>
          <Button variant="accent" onClick={submit}>Create</Button>
        </SheetFooter>
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.materialName} onConfirm={() => { if (confirmDel) { setRows((prev) => prev.filter((r) => r.id !== confirmDel.id)); toast.success('Deleted'); setConfirmDel(null); } }} />
    </PageWrapper>
  );
};
