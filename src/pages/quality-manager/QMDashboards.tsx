import { useState, useMemo } from 'react';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApi';
import { useDashboardFilters, standardColumns, InspectionDetailSheet, reportsToRecords } from '@/pages/management/dashboardHelpers';
import { ProductQualityDashboard } from '@/pages/management/ProductQualityDashboard';
import { ManufacturingQualityDashboard } from '@/pages/management/ManufacturingQualityDashboard';
import { AssemblingQualityDashboard } from '@/pages/management/AssemblingQualityDashboard';
import { MaterialQualityDashboard } from '@/pages/management/MaterialQualityDashboard';
import { SupplierEvalDashboard } from '@/pages/management/SupplierEvalDashboard';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord } from '@/types';

export const QMProductQualityDash = ProductQualityDashboard;
export const QMMfgQualityDash = ManufacturingQualityDashboard;
export const QMAsmQualityDash = AssemblingQualityDashboard;
export const QMMaterialQualityDash = MaterialQualityDashboard;
export const QMSupplierDash = SupplierEvalDashboard;

export const QMComponentQualityDash = () => {
  const { user } = useAuth();
  const query = useMemo(() => (user?.organization ? { organization: user.organization } : undefined), [user?.organization]);
  const componentPlanQuery = useMemo(
    () => (user?.organization ? { organization: user.organization, planType: 'R2_COMPONENT' } : undefined),
    [user?.organization]
  );

  const { items: reports, loading: reportsLoading } = useApiResource<any>('/inspection-reports', query);
  const { items: plans, loading: plansLoading } = useApiResource<any>('/inspection-plans', componentPlanQuery);
  const { items: products } = useApiResource<any>('/admin/products', query);
  const { items: components } = useApiResource<any>('/admin/components', query);

  const componentMap = useMemo(
    () => Object.fromEntries(components.map((c) => [c.id, c.name])),
    [components]
  );

  // reportsToRecords doesn't resolve `plan.component` (list endpoints don't populate it), so
  // separately join report -> plan -> component here to fill in componentName/componentId.
  const reportComponent = useMemo(() => {
    const plansById = new Map(plans.map((p: any) => [String(p._id ?? p.id), p]));
    const map: Record<string, { componentId?: string; componentName?: string }> = {};
    reports.forEach((r: any) => {
      const planRef = r.plan;
      const planIdRaw = typeof planRef === 'string' ? planRef : planRef?._id;
      const plan = planIdRaw ? plansById.get(String(planIdRaw)) : undefined;
      const componentId = plan?.component ? String(plan.component) : undefined;
      map[String(r._id ?? r.id)] = { componentId, componentName: componentId ? componentMap[componentId] : undefined };
    });
    return map;
  }, [reports, plans, componentMap]);

  const records = useMemo(
    () => reportsToRecords(reports, plans, { planTypes: ['R2_COMPONENT'] }).map((r) => {
      const reportId = r.id.slice(0, r.id.lastIndexOf('-'));
      const extra = reportComponent[reportId];
      return extra?.componentId ? { ...r, componentId: extra.componentId, componentName: extra.componentName } : r;
    }),
    [reports, plans, reportComponent]
  );

  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(records, 'COMPONENT');
  const [detail, setDetail] = useState<InspectionRecord | null>(null);

  if (reportsLoading || plansLoading) {
    return <p className="text-sm text-muted-foreground p-6">Loading component quality data…</p>;
  }

  const exportRows = filtered.map((r) => ({
    Date: formatDate(r.date), Product: r.productName, Component: r.componentName,
    Parameter: r.parameterName, Target: `${r.targetValue} ${r.unit}`, Actual: `${r.actualValue} ${r.unit}`,
    Variance: `${r.variance.toFixed(2)}%`, Status: r.status, Inspector: r.inspectorName, Review: r.reviewStatus,
  }));

  return (
    <>
      <QualityDashboardPage
        title="Component Quality Dashboard"
        description="Inspection quality of product components."
        data={filtered}
        columns={standardColumns('product')}
        exportRows={exportRows}
        fileName="component-quality"
        search={search} onSearchChange={setSearch}
        fromDate={from} toDate={to} onDateChange={(f, t) => { setFrom(f); setTo(t); }}
        filters={[
          { key: 'productId', label: 'Products', options: products.map((p) => ({ label: p.name, value: p.id })) },
          { key: 'status', label: 'Status', options: [{ label: 'Good', value: 'GREEN' }, { label: 'Warning', value: 'AMBER' }, { label: 'Critical', value: 'RED' }] },
        ]}
        filterState={filterState}
        onFilterChange={(k, v) => setFilterState({ ...filterState, [k]: v })}
        onRowClick={setDetail}
      />
      <InspectionDetailSheet record={detail} onClose={() => setDetail(null)} />
    </>
  );
};
