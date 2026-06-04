import { useState, useMemo } from 'react';
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
import { MaterialPlanForm } from '@/components/stores/MaterialPlanForm';
import { RAGBadge, ReviewBadge } from '@/components/dashboard/RAGBadge';
import { useData } from '@/context/DataContext';
import { formatDate } from '@/lib/utils';
import type { MaterialReceivedPlan, MaterialPlanStatus } from '@/types';

const STATUS_VARIANT: Record<MaterialPlanStatus, any> = {
  DRAFT: 'slate', SUBMITTED: 'warning', INSPECTED: 'accent', APPROVED: 'success', REJECTED: 'danger', HOLD: 'purple',
};

export const MaterialReceivedPlans = () => {
  const { materialPlans, materials, suppliers, deleteMaterialPlan } = useData();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | MaterialPlanStatus>('all');
  const [matFilter, setMatFilter] = useState('all');
  const [supFilter, setSupFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialReceivedPlan | null>(null);
  const [confirmDel, setConfirmDel] = useState<MaterialReceivedPlan | null>(null);
  const [detail, setDetail] = useState<MaterialReceivedPlan | null>(null);

  const filtered = useMemo(() => materialPlans.filter((p) => {
    if (tab !== 'all' && p.overallStatus !== tab) return false;
    if (search && !(`${p.planCode} ${p.materialName} ${p.supplierName}`.toLowerCase().includes(search.toLowerCase()))) return false;
    if (matFilter !== 'all' && p.materialId !== matFilter) return false;
    if (supFilter !== 'all' && p.supplierId !== supFilter) return false;
    if (from && p.date < from) return false;
    if (to && p.date > to + 'T23:59:59') return false;
    return true;
  }), [materialPlans, tab, search, matFilter, supFilter, from, to]);

  const count = (s: MaterialPlanStatus | 'all') => materialPlans.filter((p) => s === 'all' || p.overallStatus === s).length;
  const openAdd = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (p: MaterialReceivedPlan) => { setEditing(p); setDrawerOpen(true); };

  const handleDelete = () => { if (!confirmDel) return; const r = deleteMaterialPlan(confirmDel.id); if (!r.success) { toast.error(r.error); return; } toast.success('Deleted'); setConfirmDel(null); };

  const exportRows = filtered.map((p) => ({ PlanCode: p.planCode, Date: formatDate(p.date), Material: p.materialName, Quantity: `${p.quantity} ${p.unit}`, Supplier: p.supplierName, Product: p.productName, Inspector: p.inspectorName || '—', Status: p.overallStatus, Review: p.reviewStatus }));

  const columns: Column<MaterialReceivedPlan>[] = [
    { key: 'code', header: 'Plan', sortable: true, sortValue: (p) => p.planCode, cell: (p) => <span className="font-mono text-xs font-medium">{p.planCode}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (p) => p.date, cell: (p) => <span className="text-xs">{formatDate(p.date)}</span> },
    { key: 'mat', header: 'Material', cell: (p) => <span className="font-medium text-sm">{p.materialName}</span> },
    { key: 'qty', header: 'Qty', cell: (p) => <span className="text-xs font-mono">{p.quantity} {p.unit}</span> },
    { key: 'sup', header: 'Supplier', cell: (p) => p.supplierName },
    { key: 'prod', header: 'Product', cell: (p) => <span className="text-xs text-muted-foreground">{p.productName}</span> },
    { key: 'insp', header: 'Inspector', cell: (p) => p.inspectorName || <span className="text-muted-foreground italic text-xs">Unassigned</span> },
    { key: 'status', header: 'Status', cell: (p) => <Badge variant={STATUS_VARIANT[p.overallStatus]}>{p.overallStatus}</Badge> },
    { key: 'review', header: 'Review', cell: (p) => <ReviewBadge status={p.reviewStatus} /> },
    { key: 'actions', header: '', width: 'w-12', cell: (p) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => setDetail(p)}><Eye className="h-4 w-4" /> View Details</DropdownItem>
          <DropdownItem onClick={() => openEdit(p)} disabled={p.overallStatus !== 'DRAFT'}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger disabled={p.overallStatus !== 'DRAFT'} onClick={() => setConfirmDel(p)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
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
          <TabsTrigger value="SUBMITTED">Submitted ({count('SUBMITTED')})</TabsTrigger>
          <TabsTrigger value="INSPECTED">Inspected ({count('INSPECTED')})</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved ({count('APPROVED')})</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected ({count('REJECTED')})</TabsTrigger>
          <TabsTrigger value="HOLD">Hold ({count('HOLD')})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <Select value={matFilter} onChange={setMatFilter} options={[{ label: 'All Materials', value: 'all' }, ...materials.map((m) => ({ label: m.name, value: m.id }))]} className="w-44" />
        <Select value={supFilter} onChange={setSupFilter} options={[{ label: 'All Suppliers', value: 'all' }, ...suppliers.map((s) => ({ label: s.name, value: s.id }))]} className="w-44" />
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      <DataTable columns={columns} data={filtered} onRowClick={(p) => setDetail(p)} emptyTitle="No material plans" emptyAction={<Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Create Plan</Button>} />

      <MaterialPlanForm open={drawerOpen} onOpenChange={setDrawerOpen} editing={editing} />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[640px]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.planCode}</SheetTitle>
              <SheetDescription>{detail.materialName} · {detail.quantity} {detail.unit} from {detail.supplierName}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Date</dt><dd>{formatDate(detail.date)}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt><dd><Badge variant={STATUS_VARIANT[detail.overallStatus]}>{detail.overallStatus}</Badge></dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Method</dt><dd>{detail.method.replace('_', ' ')}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">For Product</dt><dd>{detail.productName}</dd></div>
              </div>
              <h4 className="font-semibold mb-2 text-sm">Parameters</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50"><tr><th className="text-left px-3 py-2">Parameter</th><th className="text-left px-3 py-2">Target</th><th className="text-left px-3 py-2">Actual</th><th className="text-left px-3 py-2">Variance</th><th className="text-left px-3 py-2">Status</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {detail.parameters.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 font-medium">{p.parameterName}</td>
                        <td className="px-3 py-2 font-mono">{p.targetValue} {p.unit}</td>
                        <td className="px-3 py-2 font-mono">{p.actualValue != null ? `${p.actualValue} ${p.unit}` : '—'}</td>
                        <td className="px-3 py-2 font-mono">{p.variance != null ? `${p.variance.toFixed(2)}%` : '—'}</td>
                        <td className="px-3 py-2">{p.status ? <RAGBadge status={p.status} /> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.reviewComment && <div className="mt-4 p-3 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"><p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Review Comment</p><p className="text-sm">{detail.reviewComment}</p></div>}
            </SheetBody>
          </>
        )}
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.planCode} onConfirm={handleDelete} />
    </PageWrapper>
  );
};
