import { useState } from 'react';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useData } from '@/context/DataContext';
import { useDashboardFilters, standardColumns, InspectionDetailSheet } from './dashboardHelpers';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord } from '@/types';

export const AssemblingQualityDashboard = () => {
  const { inspectionRecords, products, assemblingStages } = useData();
  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(inspectionRecords, 'ASSEMBLING');
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
        title="Assembling Stage Quality"
        description="Inspection quality across assembly operations."
        data={filtered}
        columns={standardColumns('asm')}
        exportRows={exportRows}
        fileName="assembling-quality"
        search={search} onSearchChange={setSearch}
        fromDate={from} toDate={to} onDateChange={(f, t) => { setFrom(f); setTo(t); }}
        filters={[
          { key: 'productId', label: 'Products', options: products.map((p) => ({ label: p.name, value: p.id })) },
          { key: 'stageId', label: 'Stages', options: assemblingStages.map((s) => ({ label: s.name, value: s.id })) },
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
