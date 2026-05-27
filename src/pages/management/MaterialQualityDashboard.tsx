import { useState } from 'react';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useData } from '@/context/DataContext';
import { useDashboardFilters, standardColumns, InspectionDetailSheet } from './dashboardHelpers';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord } from '@/types';

export const MaterialQualityDashboard = () => {
  const { inspectionRecords, materials, suppliers } = useData();
  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(inspectionRecords, 'MATERIAL');
  const [detail, setDetail] = useState<InspectionRecord | null>(null);

  const supplierNames = Array.from(new Set(suppliers.map((s) => s.name)));

  const exportRows = filtered.map((r) => ({
    Date: formatDate(r.date), Product: r.productName, Material: r.materialName, Supplier: r.supplierName,
    Parameter: r.parameterName, DoneBy: r.inspectorName,
    Target: `${r.targetValue} ${r.unit}`, Actual: `${r.actualValue} ${r.unit}`,
    Variance: `${r.variance.toFixed(2)}%`, Status: r.status, ReviewStatus: r.reviewStatus,
  }));

  return (
    <>
      <QualityDashboardPage
        title="Material Quality"
        description="Inspection quality of incoming materials from suppliers."
        data={filtered}
        columns={standardColumns('mat')}
        exportRows={exportRows}
        fileName="material-quality"
        search={search} onSearchChange={setSearch}
        fromDate={from} toDate={to} onDateChange={(f, t) => { setFrom(f); setTo(t); }}
        filters={[
          { key: 'materialId', label: 'Materials', options: materials.map((m) => ({ label: m.name, value: m.id })) },
          { key: 'supplierName', label: 'Suppliers', options: supplierNames.map((s) => ({ label: s, value: s })) },
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
