import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';

type AssignTab = 'MATERIAL_RECEIVED' | 'MANUFACTURING' | 'ASSEMBLING' | 'COMPONENT';

export const AssignInspectors = () => {
  const { inspectionPlans, materialPlans, users, roles, products, updateInspectionPlan, updateMaterialPlan, resourceAssignments } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState<AssignTab>('MANUFACTURING');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Unassigned' | 'Assigned'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkInspector, setBulkInspector] = useState('');
  const [busy, setBusy] = useState(false);

  const inspectorRole = roles.find((r) => r.name === 'Inspector');
  const inspectors = users.filter((u) => u.roleId === inspectorRole?.id);

  const inspectorLoad = (id: string, date?: string) =>
    resourceAssignments.filter((r) => r.inspectorId === id && r.status !== 'COMPLETED' && (!date || isSameDay(new Date(r.assignedDate), new Date(date)))).length;

  const allRows = useMemo(() => {
    if (tab === 'MATERIAL_RECEIVED') {
      return materialPlans.map((p) => ({ id: p.id, code: p.planCode, productName: p.productName, productId: p.productId, stage: `${p.materialName} (${p.quantity} ${p.unit})`, status: p.overallStatus, inspectorId: p.inspectorId, inspectorName: p.inspectorName, isMaterial: true, date: p.date }));
    }
    return inspectionPlans.filter((p) => p.type === tab).map((p) => ({ id: p.id, code: p.planCode, productName: p.productName, productId: p.productId, stage: p.stageName || p.componentName || p.materialName || '—', status: p.status, inspectorId: p.inspectorId, inspectorName: p.inspectorName, isMaterial: false, date: p.inspectionDate || p.createdAt }));
  }, [tab, inspectionPlans, materialPlans]);

  const filtered = useMemo(() => allRows.filter((r) => {
    if (productFilter !== 'all' && r.productId !== productFilter) return false;
    if (statusFilter === 'Unassigned' && r.inspectorId) return false;
    if (statusFilter === 'Assigned' && !r.inspectorId) return false;
    return true;
  }), [allRows, productFilter, statusFilter]);

  const assign = (rowId: string, inspectorId: string, isMaterial: boolean) => {
    const insp = inspectors.find((u) => u.id === inspectorId);
    if (!insp) return;
    if (isMaterial) updateMaterialPlan(rowId, { inspectorId: insp.id, inspectorName: insp.name });
    else updateInspectionPlan(rowId, { inspectorId: insp.id, inspectorName: insp.name, status: 'ACTIVE' as any });
    toast.success(`Assigned to ${insp.name}. Task notification sent.`);
  };

  const bulkAssign = async () => {
    if (!bulkInspector) { toast.error('Select inspector'); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    const insp = inspectors.find((u) => u.id === bulkInspector)!;
    selected.forEach((id) => {
      const row = allRows.find((r) => r.id === id);
      if (!row) return;
      if (row.isMaterial) updateMaterialPlan(id, { inspectorId: insp.id, inspectorName: insp.name });
      else updateInspectionPlan(id, { inspectorId: insp.id, inspectorName: insp.name, status: 'ACTIVE' as any });
    });
    toast.success(`Assigned ${selected.length} plans to ${insp.name}`);
    setSelected([]); setBulkInspector(''); setBusy(false);
  };

  const exportRows = filtered.map((r) => ({ Plan: r.code, Product: r.productName, Stage: r.stage, Inspector: r.inspectorName || 'Unassigned', Status: r.status }));

  const columns: Column<typeof allRows[0]>[] = [
    { key: 'code', header: 'Plan Code', cell: (r) => <span className="font-mono text-xs font-medium">{r.code}</span> },
    { key: 'prod', header: 'Product', cell: (r) => <span className="font-medium text-sm">{r.productName}</span> },
    { key: 'stage', header: 'Stage / Material', cell: (r) => r.stage },
    { key: 'insp', header: 'Inspector', cell: (r) => r.inspectorName ? (
      <div className="flex items-center gap-2"><Avatar name={r.inspectorName} size="sm" /><span className="text-sm">{r.inspectorName}</span></div>
    ) : <Badge variant="warning">Unassigned</Badge> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant="outline">{r.status}</Badge> },
    { key: 'assign', header: 'Assign', width: 'w-52', cell: (r) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Select value="" onChange={(v) => assign(r.id, v, r.isMaterial)} options={inspectors.map((u) => {
          const load = inspectorLoad(u.id, r.date);
          return { label: load > 1 ? `${u.name} (${load} on this date)` : u.name, value: u.id };
        })} placeholder={r.inspectorId ? 'Reassign' : 'Assign'} className="w-44" />
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

          <DataTable columns={columns} data={filtered} selectable selectedIds={selected} onSelectionChange={setSelected} emptyTitle="No plans to assign" />
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
    </PageWrapper>
  );
};
