import { useState } from 'react';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useData } from '@/context/DataContext';
import { useDashboardFilters, standardColumns, InspectionDetailSheet } from './dashboardHelpers';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord } from '@/types';

export const ManufacturingQualityDashboard = () => {
  const { inspectionRecords, products, manufacturingStages } = useData();
  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(inspectionRecords, 'MANUFACTURING');
  const [detail, setDetail] = useState<InspectionRecord | null>(null);

  const exportRows = filtered.map((r) => ({
    Date: formatDate(r.date), Product: r.productName, Stage: r.stageName,
    Parameter: r.parameterName, DoneBy: r.inspectorName,
    Target: `${r.targetValue} ${r.unit}`, Actual: `${r.actualValue} ${r.unit}`,
    Variance: `${r.variance.toFixed(2)}%`, Status: r.status,
    ReviewedBy: r.reviewedBy || '—', ReviewStatus: r.reviewStatus,
  }));

  return (
    <>
      <QualityDashboardPage
        title="Manufacturing Stage Quality"
        description="Inspection quality across all manufacturing stages."
        data={filtered}
        columns={standardColumns('mfg')}
        exportRows={exportRows}
        fileName="manufacturing-quality"
        search={search} onSearchChange={setSearch}
        fromDate={from} toDate={to} onDateChange={(f, t) => { setFrom(f); setTo(t); }}
        filters={[
          { key: 'productId', label: 'Products', options: products.map((p) => ({ label: p.name, value: p.id })) },
          { key: 'stageId', label: 'Stages', options: manufacturingStages.map((s) => ({ label: s.name, value: s.id })) },
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
