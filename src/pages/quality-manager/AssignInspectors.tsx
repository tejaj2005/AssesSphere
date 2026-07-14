import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { AISchedulingTable, SchedulingEntity } from '@/components/ai/AISchedulingTable';
import { useApiResource } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type AssignTab = 'MATERIAL_RECEIVED' | 'MANUFACTURING' | 'ASSEMBLING' | 'COMPONENT';

// Mock InspectionPlan.type -> backend InspectionPlan.planType.
const TAB_TO_PLAN_TYPE: Record<AssignTab, string> = {
  MATERIAL_RECEIVED: 'R1_MATERIAL',
  MANUFACTURING: 'R3_MANUFACTURING',
  ASSEMBLING: 'R4_ASSEMBLY',
  COMPONENT: 'R2_COMPONENT',
};

/** Ref fields may arrive populated (object) or as a raw id string depending on the endpoint. */
const refId = (v: any): string => (v && typeof v === 'object' ? v._id : v) || '';
const refName = (v: any): string => (v && typeof v === 'object' ? v.name : '') || '';

export const AssignInspectors = () => {
  const { user } = useAuth();
  // Single fetch across all plan types (mirrors the old "all inspectionPlans + materialPlans"
  // approach); tabs filter client-side so switching tabs doesn't refetch.
  const { items, loading, error, refetch } = useApiResource<any>('/inspection-plans', {
    organization: user?.organization || '',
    limit: '1000',
  }, 20000);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tab, setTab] = useState<AssignTab>('MANUFACTURING');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Unassigned' | 'Assigned'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkInspector, setBulkInspector] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.organization) return;
    api.getList<any>(`/admin/users?role=Inspector&organization=${user.organization}&limit=500`)
      .then(({ data }) => setInspectors(data.map((u: any) => ({ ...u, id: u._id }))))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load inspectors'));
    api.getList<any>(`/admin/products?organization=${user.organization}&limit=500`)
      .then(({ data }) => setProducts(data.map((p: any) => ({ ...p, id: p._id }))))
      .catch(() => {});
  }, [user?.organization]);

  // Selections are scoped to whichever plan-type tab is showing — without this, ids checked
  // on one tab silently ride along (invisible, since they don't match the new tab's rows) into
  // a bulk assignment triggered from a different tab.
  useEffect(() => { setSelected([]); }, [tab]);

  // No per-assignment "date" exists on a plan (only a single dueDate for the whole plan), so
  // workload is simplified to "how many ACTIVE plans (of any type) is this inspector on".
  const inspectorLoad = (id: string) =>
    items.filter((p) => p.status === 'ACTIVE' && (p.assignedInspectors || []).some((u: any) => refId(u) === id)).length;

  const allRows = useMemo(() => items
    .filter((p) => p.planType === TAB_TO_PLAN_TYPE[tab])
    .map((p) => {
      const inspectorNames = (Array.isArray(p.assignedInspectors) ? p.assignedInspectors : [])
        .map((u: any) => refName(u) || (typeof u === 'string' ? u : ''))
        .filter(Boolean);
      return {
        id: p.id,
        code: p.planId || p.id,
        productName: refName(p.product) || p.title || '—',
        productId: refId(p.product),
        // manufacturingStage/assemblyStage/component refs aren't populated by GET /inspection-plans,
        // so fall back to the plan's own title (for material plans, the populated material name).
        stage: tab === 'MATERIAL_RECEIVED' ? (refName(p.material) || p.title || '—') : (p.title || '—'),
        status: p.status,
        inspectorNames,
        date: p.dueDate || p.createdAt,
      };
    }), [items, tab]);

  const filtered = useMemo(() => allRows.filter((r) => {
    if (productFilter !== 'all' && r.productId !== productFilter) return false;
    if (statusFilter === 'Unassigned' && r.inspectorNames.length > 0) return false;
    if (statusFilter === 'Assigned' && r.inspectorNames.length === 0) return false;
    return true;
  }), [allRows, productFilter, statusFilter]);

  // Assigning also activates a DRAFT plan, since the inspector dashboard (GET /dashboard/inspector)
  // only surfaces plans with status ACTIVE and the inspector in assignedInspectors.
  const activateIfNeeded = async (planId: string) => {
    const plan = items.find((p) => p.id === planId);
    if (plan && plan.status !== 'ACTIVE' && plan.status !== 'COMPLETED') {
      await api.put(`/inspection-plans/${planId}/activate`);
    }
  };

  const assign = async (planId: string, inspectorId: string) => {
    const insp = inspectors.find((u) => u.id === inspectorId);
    if (!insp) return;
    try {
      await api.put(`/inspection-plans/${planId}/assign-inspector`, { inspectorId });
      await activateIfNeeded(planId);
      await refetch();
      toast.success(`Assigned to ${insp.name}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const bulkAssign = async () => {
    if (!bulkInspector) { toast.error('Select inspector'); return; }
    setBusy(true);
    try {
      const insp = inspectors.find((u) => u.id === bulkInspector);
      await Promise.all(selected.map(async (id) => {
        await api.put(`/inspection-plans/${id}/assign-inspector`, { inspectorId: bulkInspector });
        await activateIfNeeded(id);
      }));
      await refetch();
      toast.success(`Assigned ${selected.length} plan(s) to ${insp?.name || 'inspector'}.`);
      setSelected([]); setBulkInspector('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  // Scheduling entities derived from real data: one per product, with a lightweight
  // risk-score heuristic based on how many of that product's plans are still open
  // (not a substitute for the formal Intelligent Risk Scoring feature elsewhere in the app).
  const schedulingEntities: SchedulingEntity[] = useMemo(() => products.map((p) => {
    const productPlans = items.filter((pl) => refId(pl.product) === p.id);
    const openCount = productPlans.filter((pl) => pl.status !== 'COMPLETED').length;
    const mostRecent = [...productPlans].sort((a, b) =>
      new Date(b.dueDate || b.createdAt || 0).getTime() - new Date(a.dueDate || a.createdAt || 0).getTime()
    )[0];
    return {
      id: p.id,
      name: p.name,
      type: 'PRODUCT',
      lastInspectionDate: mostRecent?.dueDate || mostRecent?.createdAt || p.createdAt || new Date().toISOString(),
      riskScore: Math.min(95, openCount * 20 + 15),
      overdueCAPAs: 0,
    };
  }), [products, items]);

  const exportRows = filtered.map((r) => ({ Plan: r.code, Product: r.productName, Stage: r.stage, Inspector: r.inspectorNames.join(', ') || 'Unassigned', Status: r.status }));

  const columns: Column<typeof allRows[0]>[] = [
    { key: 'code', header: 'Plan Code', cell: (r) => <span className="font-mono text-xs font-medium">{r.code}</span> },
    { key: 'prod', header: 'Product', cell: (r) => <span className="font-medium text-sm">{r.productName}</span> },
    { key: 'stage', header: 'Stage / Material', cell: (r) => r.stage },
    { key: 'insp', header: 'Inspector', cell: (r) => r.inspectorNames.length ? (
      <div className="flex items-center gap-2"><Avatar name={r.inspectorNames[0]} size="sm" /><span className="text-sm">{r.inspectorNames.join(', ')}</span></div>
    ) : <Badge variant="warning">Unassigned</Badge> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant="outline">{r.status}</Badge> },
    { key: 'assign', header: 'Assign', width: 'w-52', cell: (r) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Select value="" onChange={(v) => assign(r.id, v)} options={inspectors.map((u) => {
          const load = inspectorLoad(u.id);
          return { label: load > 1 ? `${u.name} (${load} active)` : u.name, value: u.id };
        })} placeholder={r.inspectorNames.length ? 'Add Inspector' : 'Assign'} className="w-44" />
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader title="Assign Inspectors" description="Allocate inspectors to plans across all inspection types." action={<ExportButtons data={exportRows} fileName="inspector-assignments" />} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as AssignTab)} className="mb-4">
            <TabsList>
              <TabsTrigger value="MATERIAL_RECEIVED">Material Received</TabsTrigger>
              <TabsTrigger value="MANUFACTURING">Manufacturing</TabsTrigger>
              <TabsTrigger value="ASSEMBLING">Assembling</TabsTrigger>
              <TabsTrigger value="COMPONENT">Components</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Select value={productFilter} onChange={setProductFilter} options={[{ label: 'All Products', value: 'all' }, ...products.map((p) => ({ label: p.name, value: p.id }))]} className="w-48" />
            <Select value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[{ label: 'All Status', value: 'all' }, { label: 'Unassigned', value: 'Unassigned' }, { label: 'Assigned', value: 'Assigned' }]} className="w-40" />
          </div>

          {error && <p className="text-sm text-destructive mb-4">{error}</p>}

          <AnimatePresence>
            {selected.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-3 flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-accent/5">
                <p className="text-sm font-medium">{selected.length} selected</p>
                <Select value={bulkInspector} onChange={setBulkInspector} options={inspectors.map((u) => ({ label: u.name, value: u.id }))} placeholder="Choose inspector" className="w-48" />
                <Button size="sm" variant="accent" onClick={bulkAssign} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Assign Selected</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
              </motion.div>
            )}
          </AnimatePresence>

          <DataTable columns={columns} data={filtered} loading={loading} selectable selectedIds={selected} onSelectionChange={setSelected} emptyTitle="No plans to assign" />
        </div>

        <Card>
          <CardHeader><CardTitle>Inspector Workload</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {inspectors.map((u) => {
              const load = inspectorLoad(u.id);
              return (
                <div key={u.id} className="p-2 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar name={u.name} size="sm" />
                    <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{u.name}</p></div>
                    <Badge variant={load > 3 ? 'danger' : load > 1 ? 'warning' : 'success'}>{load} active</Badge>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${load > 3 ? 'bg-red-500' : load > 1 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (load / 5) * 100)}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {schedulingEntities.length > 0 && (
        <div className="mt-4">
          <AISchedulingTable entities={schedulingEntities} availableInspectors={inspectors.length || 3} />
        </div>
      )}
    </PageWrapper>
  );
};
