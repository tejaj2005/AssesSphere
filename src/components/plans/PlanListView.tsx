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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { InspectionPlanForm } from './InspectionPlanForm';
import { useData } from '@/context/DataContext';
import { formatDate } from '@/lib/utils';
import type { InspectionPlan, PlanType, PlanStatus } from '@/types';

const STATUS_VARIANT: Record<PlanStatus, any> = { DRAFT: 'slate', SUBMITTED: 'warning', ACTIVE: 'accent', COMPLETED: 'success' };

interface PlanListViewProps {
  type: PlanType;
  title: string;
  description: string;
  extraFilters?: 'material' | 'component' | null;
}

export const PlanListView = ({ type, title, description, extraFilters }: PlanListViewProps) => {
  const { inspectionPlans, products, manufacturingStages, assemblingStages, materials, suppliers, components, deleteInspectionPlan } = useData();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | PlanStatus>('all');
  const [productFilter, setProductFilter] = useState('all');
  const [secondaryFilter, setSecondaryFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionPlan | null>(null);
  const [confirmDel, setConfirmDel] = useState<InspectionPlan | null>(null);
  const [detail, setDetail] = useState<InspectionPlan | null>(null);

  const filtered = useMemo(() => inspectionPlans.filter((p) => {
    if (p.type !== type) return false;
    if (search && !(p.planCode.toLowerCase().includes(search.toLowerCase()) || p.productName.toLowerCase().includes(search.toLowerCase()))) return false;
    if (tab !== 'all' && p.status !== tab) return false;
    if (productFilter !== 'all' && p.productId !== productFilter) return false;
    if (secondaryFilter !== 'all') {
      if (extraFilters === 'material' && p.materialId !== secondaryFilter) return false;
      if (extraFilters === 'component' && p.componentId !== secondaryFilter) return false;
      if (!extraFilters && p.stageId !== secondaryFilter) return false;
    }
    return true;
  }), [inspectionPlans, type, search, tab, productFilter, secondaryFilter, extraFilters]);

  const stagesForProduct = (pid: string) => {
    const prod = products.find((p) => p.id === pid);
    if (!prod) return [];
    if (type === 'MANUFACTURING') return manufacturingStages.filter((s) => prod.manufacturingStageIds.includes(s.id));
    if (type === 'ASSEMBLING') return assemblingStages.filter((s) => prod.assemblingStageIds.includes(s.id));
    return [];
  };

  const secondaryOptions = (() => {
    if (extraFilters === 'material') return materials.map((m) => ({ label: m.name, value: m.id }));
    if (extraFilters === 'component') return components.map((c) => ({ label: c.name, value: c.id }));
    const allStages = type === 'MANUFACTURING' ? manufacturingStages : assemblingStages;
    return allStages.map((s) => ({ label: s.name, value: s.id }));
  })();

  const secondaryLabel = extraFilters === 'material' ? 'Material' : extraFilters === 'component' ? 'Component' : 'Stage';

  const openAdd = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (p: InspectionPlan) => { setEditing(p); setDrawerOpen(true); };

  const handleDelete = () => {
    if (!confirmDel) return;
    const res = deleteInspectionPlan(confirmDel.id);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(`${confirmDel.planCode} deleted`);
    setConfirmDel(null);
  };

  const tabCounts = (s: PlanStatus | 'all') => inspectionPlans.filter((p) => p.type === type && (s === 'all' || p.status === s)).length;

  const exportRows = filtered.map((p) => ({
    PlanCode: p.planCode, Product: p.productName,
    Stage: p.stageName || p.componentName || p.materialName || '—',
    Parameters: p.parameters.length, Inspector: p.inspectorName || '—',
    Status: p.status, Created: formatDate(p.createdAt),
  }));

  const columns: Column<InspectionPlan>[] = [
    { key: 'code', header: 'Plan Code', sortable: true, sortValue: (p) => p.planCode, cell: (p) => <span className="font-mono font-medium text-xs">{p.planCode}</span> },
    { key: 'product', header: 'Product', sortable: true, sortValue: (p) => p.productName, cell: (p) => <span className="font-medium text-sm">{p.productName}</span> },
    { key: 'target', header: secondaryLabel, cell: (p) => p.stageName || p.componentName || p.materialName || '—' },
    { key: 'params', header: 'Parameters', cell: (p) => <Badge variant="outline">{p.parameters.length}</Badge> },
    { key: 'inspector', header: 'Inspector', cell: (p) => p.inspectorName || <span className="text-muted-foreground italic">Unassigned</span> },
    { key: 'status', header: 'Status', cell: (p) => <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge> },
    { key: 'created', header: 'Created', sortable: true, sortValue: (p) => p.createdAt, cell: (p) => <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span> },
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
      <PageHeader title={title} description={description} action={
        <>
          <ExportButtons data={exportRows} fileName={`${type.toLowerCase()}-plans`} />
          <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Create Plan</Button>
        </>
      } />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({tabCounts('all')})</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft ({tabCounts('DRAFT')})</TabsTrigger>
          <TabsTrigger value="SUBMITTED">Submitted ({tabCounts('SUBMITTED')})</TabsTrigger>
          <TabsTrigger value="ACTIVE">Active ({tabCounts('ACTIVE')})</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed ({tabCounts('COMPLETED')})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search plans…" className="sm:w-72" />
        <Select value={productFilter} onChange={(v) => { setProductFilter(v); setSecondaryFilter('all'); }} options={[{ label: 'All Products', value: 'all' }, ...products.map((p) => ({ label: p.name, value: p.id }))]} className="w-48" />
        <Select value={secondaryFilter} onChange={setSecondaryFilter} options={[{ label: `All ${secondaryLabel}s`, value: 'all' }, ...secondaryOptions]} className="w-48" />
      </div>

      <DataTable columns={columns} data={filtered} onRowClick={(p) => setDetail(p)}
        emptyTitle="No plans created"
        emptyDescription={search ? `No results for "${search}"` : 'Create your first inspection plan.'}
        emptyAction={!search && <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Create Plan</Button>}
      />

      <InspectionPlanForm open={drawerOpen} onOpenChange={setDrawerOpen} type={type} editing={editing} />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[640px]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.planCode}</SheetTitle>
              <SheetDescription>{detail.productName} · {detail.stageName || detail.componentName || detail.materialName}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Status</dt><dd className="mt-1"><Badge variant={STATUS_VARIANT[detail.status]}>{detail.status}</Badge></dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Inspector</dt><dd className="mt-1">{detail.inspectorName || '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Inspection Date</dt><dd className="mt-1">{detail.inspectionDate ? formatDate(detail.inspectionDate) : '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Created</dt><dd className="mt-1">{formatDate(detail.createdAt)}</dd></div>
              </div>
              <h4 className="font-semibold mb-2">Parameters ({detail.parameters.length})</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Unit</th>
                      <th className="text-left px-3 py-2">Target</th>
                      <th className="text-left px-3 py-2">Equipment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detail.parameters.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 font-medium">{p.parameterName}</td>
                        <td className="px-3 py-2">{p.unit}</td>
                        <td className="px-3 py-2">{p.targetValue}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.equipmentName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SheetBody>
          </>
        )}
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.planCode} onConfirm={handleDelete} />
    </PageWrapper>
  );
};
