import { useMemo, useState } from 'react';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApi';
import { useDashboardFilters, standardColumns, InspectionDetailSheet, reportsToRecords } from './dashboardHelpers';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord } from '@/types';

export const ManufacturingQualityDashboard = () => {
  const { user } = useAuth();
  const organization = user?.organization ?? '';

  const { items: reports } = useApiResource<any>('/inspection-reports', { organization, limit: '200' }, 20000);
  const { items: plans } = useApiResource<any>('/inspection-plans', { organization, planType: 'R3_MANUFACTURING', limit: '200' }, 20000);
  const { items: products } = useApiResource<any>('/admin/products', { organization });
  const { items: manufacturingStages } = useApiResource<any>('/admin/manufacturing-stages', { organization });

  const stageMap = useMemo(() => Object.fromEntries(manufacturingStages.map((s: any) => [s.id, s.name])), [manufacturingStages]);
  const records = useMemo(
    () => reportsToRecords(reports, plans, { planTypes: ['R3_MANUFACTURING'], stageKey: 'manufacturingStage', stageMap }),
    [reports, plans, stageMap]
  );

  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(records, 'MANUFACTURING');
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
          { key: 'productId', label: 'Products', options: products.map((p: any) => ({ label: p.name, value: p.id })) },
          { key: 'stageId', label: 'Stages', options: manufacturingStages.map((s: any) => ({ label: s.name, value: s.id })) },
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
