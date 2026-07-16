import { useState, useMemo } from 'react';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApi';
import { useDashboardFilters, standardColumns, InspectionDetailSheet, reportsToRecords } from '@/pages/management/dashboardHelpers';
import { SupplierEvalDashboard } from '@/pages/management/SupplierEvalDashboard';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord } from '@/types';

export const SMMaterialQualityDash = () => {
  const { user } = useAuth();
  const query = useMemo(() => (user?.organization ? { organization: user.organization } : undefined), [user?.organization]);
  const materialPlanQuery = useMemo(
    () => (user?.organization ? { organization: user.organization, planType: 'R1_MATERIAL' } : undefined),
    [user?.organization]
  );

  const { items: reports, loading: reportsLoading } = useApiResource<any>('/inspection-reports', query);
  const { items: plans, loading: plansLoading } = useApiResource<any>('/inspection-plans', materialPlanQuery);
  const { items: materials } = useApiResource<any>('/admin/materials', query);
  const { items: suppliers } = useApiResource<any>('/admin/suppliers', query);

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers]
  );

  const records = useMemo(
    () => reportsToRecords(reports, plans, { planTypes: ['R1_MATERIAL'], supplierMap }),
    [reports, plans, supplierMap]
  );

  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(records, 'MATERIAL');
  const [detail, setDetail] = useState<InspectionRecord | null>(null);
  const supplierNames = Array.from(new Set(suppliers.map((s) => s.name)));
  const exportRows = filtered.map((r) => ({ Date: formatDate(r.date), Material: r.materialName, Supplier: r.supplierName, Parameter: r.parameterName, Target: `${r.targetValue} ${r.unit}`, Actual: `${r.actualValue} ${r.unit}`, Variance: `${r.variance.toFixed(2)}%`, Status: r.status, Review: r.reviewStatus }));

  if (reportsLoading || plansLoading) {
    return <p className="text-sm text-muted-foreground p-6">Loading material quality data…</p>;
  }

  return (
    <>
      <QualityDashboardPage
        title="Material Quality Dashboard"
        description="Inspection quality of incoming materials."
        data={filtered}
        columns={standardColumns('mat')}
        exportRows={exportRows}
        fileName="sm-material-quality"
        search={search} onSearchChange={setSearch}
        fromDate={from} toDate={to} onDateChange={(f, t) => { setFrom(f); setTo(t); }}
        filters={[
          { key: 'materialId', label: 'Materials', options: materials.map((m) => ({ label: m.name, value: m.id })) },
          { key: 'supplierName', label: 'Suppliers', options: supplierNames.map((s) => ({ label: s, value: s })) },
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

export const SMSupplierDash = SupplierEvalDashboard;
