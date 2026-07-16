import { useMemo, useState } from 'react';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApi';
import { useDashboardFilters, standardColumns, InspectionDetailSheet, reportsToRecords } from './dashboardHelpers';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord } from '@/types';

export const MaterialQualityDashboard = () => {
  const { user } = useAuth();
  const organization = user?.organization ?? '';

  const { items: reports } = useApiResource<any>('/inspection-reports', { organization, planType: 'R1_MATERIAL', limit: '200' }, 20000);
  const { items: plans } = useApiResource<any>('/inspection-plans', { organization, planType: 'R1_MATERIAL', limit: '200' }, 20000);
  const { items: materials } = useApiResource<any>('/admin/materials', { organization });
  const { items: suppliers } = useApiResource<any>('/admin/suppliers', { organization });

  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map((s: any) => [s.id, s.name])), [suppliers]);
  const records = useMemo(
    () => reportsToRecords(reports, plans, { planTypes: ['R1_MATERIAL'], supplierMap }),
    [reports, plans, supplierMap]
  );

  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(records, 'MATERIAL');
  const [detail, setDetail] = useState<InspectionRecord | null>(null);

  const supplierNames = Array.from(new Set(suppliers.map((s: any) => s.name)));

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
          { key: 'materialId', label: 'Materials', options: materials.map((m: any) => ({ label: m.name, value: m.id })) },
          { key: 'supplierName', label: 'Suppliers', options: supplierNames.map((s: string) => ({ label: s, value: s })) },
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
