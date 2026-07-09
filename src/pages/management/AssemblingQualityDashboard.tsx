import { useMemo, useState } from 'react';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApi';
import { useDashboardFilters, standardColumns, InspectionDetailSheet, reportsToRecords } from './dashboardHelpers';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord } from '@/types';

export const AssemblingQualityDashboard = () => {
  const { user } = useAuth();
  const organization = user?.organization ?? '';

  const { items: reports } = useApiResource<any>('/inspection-reports', { organization, limit: '200' });
  const { items: plans } = useApiResource<any>('/inspection-plans', { organization, planType: 'R4_ASSEMBLY', limit: '200' });
  const { items: products } = useApiResource<any>('/admin/products', { organization });
  const { items: assemblingStages } = useApiResource<any>('/admin/assembly-stages', { organization });

  const stageMap = useMemo(() => Object.fromEntries(assemblingStages.map((s: any) => [s.id, s.name])), [assemblingStages]);
  const records = useMemo(
    () => reportsToRecords(reports, plans, { planTypes: ['R4_ASSEMBLY'], stageKey: 'assemblyStage', stageMap }),
    [reports, plans, stageMap]
  );

  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(records, 'ASSEMBLING');
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
          { key: 'productId', label: 'Products', options: products.map((p: any) => ({ label: p.name, value: p.id })) },
          { key: 'stageId', label: 'Stages', options: assemblingStages.map((s: any) => ({ label: s.name, value: s.id })) },
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
