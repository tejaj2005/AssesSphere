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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { InspectionPlanForm } from './InspectionPlanForm';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { PlanType } from '@/types';

// Backend InspectionPlan has no SUBMITTED state — DRAFT plans go straight to ACTIVE
// via the form's "Submit" action (mirrors the MaterialPlanForm sibling's convention).
type BackendPlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';

const STATUS_VARIANT: Record<BackendPlanStatus, any> = {
  DRAFT: 'slate', ACTIVE: 'accent', COMPLETED: 'success', ON_HOLD: 'warning', CANCELLED: 'danger',
};

export const TYPE_MAP: Record<PlanType, string> = {
  MANUFACTURING: 'R3_MANUFACTURING',
  ASSEMBLING: 'R4_ASSEMBLY',
  MATERIAL: 'R1_MATERIAL',
  COMPONENT: 'R2_COMPONENT',
};

interface PlanListViewProps {
  type: PlanType;
  title: string;
  description: string;
  extraFilters?: 'material' | 'component' | null;
}

// A ref field from the list endpoint may come back either populated (an object with
// _id/name) or as a raw ObjectId string, depending on which fields that endpoint
// chooses to populate. These two helpers normalize across both shapes.
const idOf = (v: any): string | undefined => (v && typeof v === 'object' ? v._id : v);
const nameOf = (v: any): string | undefined => (v && typeof v === 'object' ? v.name : undefined);

export const PlanListView = ({ type, title, description, extraFilters }: PlanListViewProps) => {
  const { user } = useAuth();
  const planType = TYPE_MAP[type];

  const { items: inspectionPlans, loading, remove } = useApiResource<any>(
    '/inspection-plans',
    user?.organization ? { organization: user.organization, planType } : undefined
  );

  const [products, setProducts] = useState<any[]>([]);
  const [manufacturingStages, setManufacturingStages] = useState<any[]>([]);
  const [assemblingStages, setAssemblingStages] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.organization) return;
    const org = user.organization;
    api.getList<any>(`/admin/products?organization=${org}&limit=500`).then(({ data }) => setProducts(data)).catch(() => {});
    api.getList<any>(`/admin/manufacturing-stages?organization=${org}`).then(({ data }) => setManufacturingStages(data)).catch(() => {});
    api.getList<any>(`/admin/assembly-stages?organization=${org}`).then(({ data }) => setAssemblingStages(data)).catch(() => {});
    api.getList<any>(`/admin/materials?organization=${org}`).then(({ data }) => setMaterials(data)).catch(() => {});
    api.getList<any>(`/admin/suppliers?organization=${org}&limit=500`).then(({ data }) => setSuppliers(data)).catch(() => {});
    api.getList<any>(`/admin/components?organization=${org}`).then(({ data }) => setComponents(data)).catch(() => {});
  }, [user?.organization]);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | BackendPlanStatus>('all');
  const [productFilter, setProductFilter] = useState('all');
  const [secondaryFilter, setSecondaryFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDel, setConfirmDel] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);

  const stageIdOf = (p: any) => (type === 'MANUFACTURING' ? p.manufacturingStage : type === 'ASSEMBLING' ? p.assemblyStage : undefined);

  const targetLabel = (p: any) => {
    if (type === 'MANUFACTURING') return nameOf(p.manufacturingStage) || manufacturingStages.find((s) => s._id === idOf(p.manufacturingStage))?.name;
    if (type === 'ASSEMBLING') return nameOf(p.assemblyStage) || assemblingStages.find((s) => s._id === idOf(p.assemblyStage))?.name;
    if (type === 'COMPONENT') return nameOf(p.component) || components.find((c) => c._id === idOf(p.component))?.name;
    if (type === 'MATERIAL') return p.material?.name;
    return undefined;
  };

  const inspectorNameOf = (p: any) => p.assignedInspectors?.[0]?.name;

  const filtered = useMemo(() => inspectionPlans.filter((p: any) => {
    if (search) {
      const s = search.toLowerCase();
      const hay = `${p.planId || ''} ${p.title || ''} ${p.product?.name || ''}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    if (tab !== 'all' && p.status !== tab) return false;
    if (productFilter !== 'all' && idOf(p.product) !== productFilter) return false;
    if (secondaryFilter !== 'all') {
      if (extraFilters === 'material') { if (idOf(p.material) !== secondaryFilter) return false; }
      else if (extraFilters === 'component') { if (idOf(p.component) !== secondaryFilter) return false; }
      else { if (idOf(stageIdOf(p)) !== secondaryFilter) return false; }
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [inspectionPlans, type, search, tab, productFilter, secondaryFilter, extraFilters]);

  const secondaryOptions = (() => {
    if (extraFilters === 'material') return materials.map((m) => ({ label: m.name, value: m._id }));
    if (extraFilters === 'component') return components.map((c) => ({ label: c.name, value: c._id }));
    const allStages = type === 'MANUFACTURING' ? manufacturingStages : assemblingStages;
    return allStages.map((s) => ({ label: s.name, value: s._id }));
  })();

  const secondaryLabel = extraFilters === 'material' ? 'Material' : extraFilters === 'component' ? 'Component' : 'Stage';

  const openAdd = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setDrawerOpen(true); };

  const openDetail = async (p: any) => {
    setDetail(p);
    try {
      const full = await api.get<any>(`/inspection-plans/${p.id}`);
      setDetail({ ...full, id: full._id });
    } catch {
      // keep the partially-populated row data if the detail fetch fails
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await remove(confirmDel.id);
      toast.success(`${confirmDel.planId} deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const tabCounts = (s: BackendPlanStatus | 'all') => inspectionPlans.filter((p: any) => s === 'all' || p.status === s).length;

  const exportRows = filtered.map((p: any) => ({
    PlanCode: p.planId, Product: p.product?.name || '—',
    Stage: targetLabel(p) || '—',
    Parameters: p.checklistTemplate?.length || 0, Inspector: inspectorNameOf(p) || '—',
    Status: p.status, Created: formatDate(p.createdAt),
  }));

  const columns: Column<any>[] = [
    { key: 'code', header: 'Plan Code', sortable: true, sortValue: (p) => p.planId, cell: (p) => <span className="font-mono font-medium text-xs">{p.planId}</span> },
    { key: 'product', header: 'Product', sortable: true, sortValue: (p) => p.product?.name || '', cell: (p) => <span className="font-medium text-sm">{p.product?.name}</span> },
    { key: 'target', header: secondaryLabel, cell: (p) => targetLabel(p) || '—' },
    { key: 'params', header: 'Parameters', cell: (p) => <Badge variant="outline">{p.checklistTemplate?.length || 0}</Badge> },
    { key: 'inspector', header: 'Inspector', cell: (p) => inspectorNameOf(p) || <span className="text-muted-foreground italic">Unassigned</span> },
    { key: 'status', header: 'Status', cell: (p) => <Badge variant={STATUS_VARIANT[p.status as BackendPlanStatus]}>{p.status}</Badge> },
    { key: 'created', header: 'Created', sortable: true, sortValue: (p) => p.createdAt, cell: (p) => <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span> },
    { key: 'actions', header: '', width: 'w-12', cell: (p) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => openDetail(p)}><Eye className="h-4 w-4" /> View Details</DropdownItem>
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
          <TabsTrigger value="ACTIVE">Active ({tabCounts('ACTIVE')})</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed ({tabCounts('COMPLETED')})</TabsTrigger>
          <TabsTrigger value="ON_HOLD">On Hold ({tabCounts('ON_HOLD')})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search plans…" className="sm:w-72" />
        <Select value={productFilter} onChange={(v) => { setProductFilter(v); setSecondaryFilter('all'); }} options={[{ label: 'All Products', value: 'all' }, ...products.map((p) => ({ label: p.name, value: p._id }))]} className="w-48" />
        <Select value={secondaryFilter} onChange={setSecondaryFilter} options={[{ label: `All ${secondaryLabel}s`, value: 'all' }, ...secondaryOptions]} className="w-48" />
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} onRowClick={(p) => openDetail(p)}
        emptyTitle="No plans created"
        emptyDescription={search ? `No results for "${search}"` : 'Create your first inspection plan.'}
        emptyAction={!search && <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Create Plan</Button>}
      />

      <InspectionPlanForm open={drawerOpen} onOpenChange={setDrawerOpen} type={type} editing={editing} />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[640px]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.planId}</SheetTitle>
              <SheetDescription>{detail.product?.name} · {targetLabel(detail)}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Status</dt><dd className="mt-1"><Badge variant={STATUS_VARIANT[detail.status as BackendPlanStatus]}>{detail.status}</Badge></dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Inspector</dt><dd className="mt-1">{inspectorNameOf(detail) || '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Due Date</dt><dd className="mt-1">{detail.dueDate ? formatDate(detail.dueDate) : '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Created</dt><dd className="mt-1">{formatDate(detail.createdAt)}</dd></div>
              </div>
              <h4 className="font-semibold mb-2">Parameters ({detail.checklistTemplate?.length || 0})</h4>
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
                    {(detail.checklistTemplate || []).map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{c.parameter}</td>
                        <td className="px-3 py-2">{c.unit}</td>
                        <td className="px-3 py-2">{c.specificationValue}</td>
                        <td className="px-3 py-2 text-muted-foreground">{nameOf(c.equipment) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SheetBody>
          </>
        )}
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.planId} onConfirm={handleDelete} />
    </PageWrapper>
  );
};
