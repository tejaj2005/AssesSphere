import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { StageTimeline } from '@/components/shared/StageTimeline';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApi';
import { useDashboardFilters, standardColumns, InspectionDetailSheet, reportsToRecords } from './dashboardHelpers';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord } from '@/types';

export const ProductQualityDashboard = () => {
  const { user } = useAuth();
  const organization = user?.organization ?? '';
  const navigate = useNavigate();

  // Product-wide overview: every InspectionReport regardless of plan type (mfg/asm/material/component/final),
  // joined against the matching InspectionPlan list so product/material names can be recovered.
  const { items: reports } = useApiResource<any>('/inspection-reports', { organization, limit: '200' }, 20000);
  const { items: plans } = useApiResource<any>('/inspection-plans', { organization, limit: '200' }, 20000);
  const { items: products } = useApiResource<any>('/admin/products', { organization });

  const records = useMemo(() => reportsToRecords(reports, plans), [reports, plans]);

  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(records);
  const [detail, setDetail] = useState<InspectionRecord | null>(null);

  const exportRows = filtered.map((r) => ({
    Date: formatDate(r.date), Product: r.productName, ProductID: r.productId,
    Parameter: r.parameterName, Target: `${r.targetValue} ${r.unit}`, Actual: `${r.actualValue} ${r.unit}`,
    Variance: `${r.variance.toFixed(2)}%`, Status: r.status,
    ReviewedBy: r.reviewedBy || '—', ReviewedDate: r.reviewedDate ? formatDate(r.reviewedDate) : '—', ReviewStatus: r.reviewStatus,
  }));

  return (
    <>
      <QualityDashboardPage
        title="Product Quality Performance"
        description="Overall inspection quality across all products."
        data={filtered}
        columns={standardColumns('product')}
        exportRows={exportRows}
        fileName="product-quality"
        search={search} onSearchChange={setSearch}
        fromDate={from} toDate={to} onDateChange={(f, t) => { setFrom(f); setTo(t); }}
        filters={[
          { key: 'productId', label: 'Products', options: products.map((p: any) => ({ label: p.name, value: p.id })) },
          { key: 'status', label: 'Status', options: [{ label: 'Good', value: 'GREEN' }, { label: 'Warning', value: 'AMBER' }, { label: 'Critical', value: 'RED' }] },
        ]}
        filterState={filterState}
        onFilterChange={(k, v) => setFilterState({ ...filterState, [k]: v })}
        onRowClick={(r) => {
          if (r.status === 'RED') navigate(`/management/manufacturing-quality?product=${r.productId}`);
          else setDetail(r);
        }}
        extraSlot={<div className="mb-6"><StageTimeline title="Production Timeline" /></div>}
      />
      <InspectionDetailSheet record={detail} onClose={() => setDetail(null)} />
    </>
  );
};
