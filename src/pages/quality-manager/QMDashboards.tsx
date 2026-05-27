import { useState } from 'react';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useData } from '@/context/DataContext';
import { useDashboardFilters, standardColumns, InspectionDetailSheet } from '@/pages/management/dashboardHelpers';
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
  const { inspectionRecords, products, components } = useData();
  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(inspectionRecords, 'COMPONENT');
  const [detail, setDetail] = useState<InspectionRecord | null>(null);

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
          { key: 'status', label: 'Status', options: [{ label: 'Green', value: 'GREEN' }, { label: 'Amber', value: 'AMBER' }, { label: 'Red', value: 'RED' }] },
        ]}
        filterState={filterState}
        onFilterChange={(k, v) => setFilterState({ ...filterState, [k]: v })}
        onRowClick={setDetail}
      />
      <InspectionDetailSheet record={detail} onClose={() => setDetail(null)} />
    </>
  );
};
