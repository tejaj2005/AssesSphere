import { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { MaterialPlanForm, parseMaterialInstructions } from '@/components/stores/MaterialPlanForm';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type PlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';

const STATUS_VARIANT: Record<PlanStatus, any> = {
  DRAFT: 'slate', ACTIVE: 'accent', COMPLETED: 'success', CANCELLED: 'danger', ON_HOLD: 'purple',
};

/** Ref fields may arrive populated (object) or as a raw id string depending on the endpoint. */
const refId = (v: any): string => (v && typeof v === 'object' ? v._id : v) || '';

export const MaterialReceivedPlans = () => {
  const { user } = useAuth();
  const { items, loading, error, refetch, remove } = useApiResource<any>('/inspection-plans', {
    planType: 'R1_MATERIAL',
    organization: user?.organization || '',
    limit: '500',
  });
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | PlanStatus>('all');
  const [matFilter, setMatFilter] = useState('all');
  const [supFilter, setSupFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDel, setConfirmDel] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    if (!user?.organization) return;
    const q = `?organization=${user.organization}`;
    api.getList<any>(`/admin/materials${q}`).then(({ data }) => setMaterials(data)).catch(() => {});
    api.getList<any>(`/admin/suppliers${q}`).then(({ data }) => setSuppliers(data)).catch(() => {});
  }, [user?.organization]);

  const supplierNames = useMemo(() => Object.fromEntries(suppliers.map((s) => [s._id, s.name])), [suppliers]);

  // Flatten backend InspectionPlan (planType R1_MATERIAL) into the shape the table/detail UI renders.
  // quantity/unit/method/observations are folded into `instructions` by MaterialPlanForm — parse them back out.
  const plans = useMemo(() => items.map((p) => {
    const parsed = parseMaterialInstructions(p.instructions);
    return {
      ...p,
      planCode: p.planId || p.id,
      date: p.dueDate || p.createdAt || '',
      materialRef: refId(p.material),
      materialName: (p.material && typeof p.material === 'object' ? p.material.name : '') || '—',
      supplierRef: refId(p.supplier),
      supplierName: (p.supplier && typeof p.supplier === 'object' ? p.supplier.name : supplierNames[refId(p.supplier)]) || '—',
      productName: (p.product && typeof p.product === 'object' ? p.product.name : '') || '—',
      inspectorName: p.assignedInspectors?.[0]?.name || '',
      quantity: parsed.quantity,
      unit: parsed.unit,
      method: parsed.method,
      observations: parsed.observations,
    };
  }), [items, supplierNames]);

  const filtered = useMemo(() => plans.filter((p) => {
    if (tab !== 'all' && p.status !== tab) return false;
    if (search && !(`${p.planCode} ${p.materialName} ${p.supplierName}`.toLowerCase().includes(search.toLowerCase()))) return false;
    if (matFilter !== 'all' && p.materialRef !== matFilter) return false;
    if (supFilter !== 'all' && p.supplierRef !== supFilter) return false;
    if (from && p.date < from) return false;
    if (to && p.date > to + 'T23:59:59') return false;
    return true;
  }), [plans, tab, search, matFilter, supFilter, from, to]);

  const count = (s: PlanStatus | 'all') => plans.filter((p) => s === 'all' || p.status === s).length;
  const openAdd = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setDrawerOpen(true); };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await remove(confirmDel.id);
      toast.success('Deleted');
      setConfirmDel(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const exportRows = filtered.map((p) => ({ PlanCode: p.planCode, Date: p.date ? formatDate(p.date) : '—', Material: p.materialName, Quantity: `${p.quantity} ${p.unit}`, Supplier: p.supplierName, Product: p.productName, Inspector: p.inspectorName || '—', Status: p.status }));

  const columns: Column<any>[] = [
    { key: 'code', header: 'Plan', sortable: true, sortValue: (p) => p.planCode, cell: (p) => <span className="font-mono text-xs font-medium">{p.planCode}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (p) => p.date, cell: (p) => <span className="text-xs">{p.date ? formatDate(p.date) : '—'}</span> },
    { key: 'mat', header: 'Material', cell: (p) => <span className="font-medium text-sm">{p.materialName}</span> },
    { key: 'qty', header: 'Qty', cell: (p) => <span className="text-xs font-mono">{p.quantity} {p.unit}</span> },
    { key: 'sup', header: 'Supplier', cell: (p) => p.supplierName },
    { key: 'prod', header: 'Product', cell: (p) => <span className="text-xs text-muted-foreground">{p.productName}</span> },
    { key: 'insp', header: 'Inspector', cell: (p) => p.inspectorName || <span className="text-muted-foreground italic text-xs">Unassigned</span> },
    { key: 'status', header: 'Status', cell: (p) => <Badge variant={STATUS_VARIANT[p.status as PlanStatus] || 'slate'}>{String(p.status).replace('_', ' ')}</Badge> },
    { key: 'actions', header: '', width: 'w-12', cell: (p) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => setDetail(p)}><Eye className="h-4 w-4" /> View Details</DropdownItem>
          <DropdownItem onClick={() => openEdit(p)} disabled={p.status !== 'DRAFT'}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger disabled={p.status !== 'DRAFT'} onClick={() => setConfirmDel(p)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
        </Dropdown>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader title="Material Received Inspection Plans" description="Create and track incoming material inspection plans." action={
        <>
          <ExportButtons data={exportRows} fileName="material-plans" />
          <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Create Plan</Button>
        </>
      } />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({count('all')})</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft ({count('DRAFT')})</TabsTrigger>
          <TabsTrigger value="ACTIVE">Active ({count('ACTIVE')})</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed ({count('COMPLETED')})</TabsTrigger>
          <TabsTrigger value="ON_HOLD">On Hold ({count('ON_HOLD')})</TabsTrigger>
          <TabsTrigger value="CANCELLED">Cancelled ({count('CANCELLED')})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <Select value={matFilter} onChange={setMatFilter} options={[{ label: 'All Materials', value: 'all' }, ...materials.map((m) => ({ label: m.name, value: m._id }))]} className="w-44" />
        <Select value={supFilter} onChange={setSupFilter} options={[{ label: 'All Suppliers', value: 'all' }, ...suppliers.map((s) => ({ label: s.name, value: s._id }))]} className="w-44" />
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <DataTable columns={columns} data={filtered} loading={loading} onRowClick={(p) => setDetail(p)} emptyTitle="No material plans" emptyAction={<Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Create Plan</Button>} />

      <MaterialPlanForm open={drawerOpen} onOpenChange={setDrawerOpen} editing={editing} onSaved={refetch} />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[640px]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.planCode}</SheetTitle>
              <SheetDescription>{detail.materialName} · {detail.quantity} {detail.unit} from {detail.supplierName}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Date</dt><dd>{detail.date ? formatDate(detail.date) : '—'}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt><dd><Badge variant={STATUS_VARIANT[detail.status as PlanStatus] || 'slate'}>{String(detail.status).replace('_', ' ')}</Badge></dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Method</dt><dd>{String(detail.method).replace('_', ' ')}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">For Product</dt><dd>{detail.productName}</dd></div>
              </div>
              <h4 className="font-semibold mb-2 text-sm">Parameters</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50"><tr><th className="text-left px-3 py-2">Parameter</th><th className="text-left px-3 py-2">Target</th><th className="text-left px-3 py-2">Unit</th><th className="text-left px-3 py-2">Mandatory</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {(detail.checklistTemplate || []).map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{c.parameter}</td>
                        <td className="px-3 py-2 font-mono">{c.specificationValue}</td>
                        <td className="px-3 py-2 font-mono">{c.unit || '—'}</td>
                        <td className="px-3 py-2">{c.mandatory ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.observations && <div className="mt-4 p-3 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"><p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Observations</p><p className="text-sm">{detail.observations}</p></div>}
            </SheetBody>
          </>
        )}
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.planCode} onConfirm={handleDelete} />
    </PageWrapper>
  );
};
