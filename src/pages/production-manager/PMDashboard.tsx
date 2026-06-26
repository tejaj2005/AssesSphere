import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, ClipboardList, ClockIcon, CheckCircle2, Factory, Users } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QualityDashboardPage } from '@/components/dashboard/QualityDashboardPage';
import { useDashboardFilters, standardColumns, InspectionDetailSheet } from '@/pages/management/dashboardHelpers';
import { StageTimeline } from '@/components/shared/StageTimeline';
import { useData } from '@/context/DataContext';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { InspectionRecord } from '@/types';

const planCompletion = (stages: { status: string }[]) =>
  stages.length ? Math.round((stages.filter((s) => s.status === 'COMPLETED').length / stages.length) * 100) : 0;

export const PMDashboard = () => {
  const { inspectionRecords, inspectionPlans, products, productionPlans } = useData();
  const navigate = useNavigate();
  const { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState } = useDashboardFilters(inspectionRecords);
  const [detail, setDetail] = useState<InspectionRecord | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const acknowledge = (productId: string, productName: string) => {
    setAcknowledged((prev) => new Set(prev).add(productId));
    toast.success(`Acknowledged plan for ${productName}`);
  };

  const myProducts = products.length;
  const activePlans = inspectionPlans.filter((p) => p.status === 'ACTIVE').length;
  const pending = inspectionRecords.filter((r) => r.reviewStatus === 'PENDING').length;
  const completedThisMonth = inspectionRecords.filter((r) => {
    const d = new Date(r.reviewedDate || '');
    return r.reviewStatus === 'APPROVED' && d.getMonth() === new Date().getMonth();
  }).length;

  const productPlans = products.map((p) => {
    const plans = inspectionPlans.filter((pl) => pl.productId === p.id);
    const total = plans.length;
    const done = plans.filter((pl) => pl.status === 'COMPLETED').length;
    return { product: p, plans, total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  });

  const exportRows = filtered.map((r) => ({
    Date: formatDate(r.date), Product: r.productName, Parameter: r.parameterName,
    Target: r.targetValue, Actual: r.actualValue, Variance: `${r.variance.toFixed(2)}%`, Status: r.status, Review: r.reviewStatus,
  }));

  return (
    <>
      <PageWrapper>
        <PageHeader title="Production Manager Dashboard" description="Overview of your products, plans and pending reviews." />

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div variants={staggerItem}><StatsCard label="My Products" value={myProducts} icon={Package} variant="accent" /></motion.div>
          <motion.div variants={staggerItem}><StatsCard label="Active Plans" value={activePlans} icon={ClipboardList} variant="success" /></motion.div>
          <motion.div variants={staggerItem}><StatsCard label="Pending Reviews" value={pending} icon={ClockIcon} variant="warning" /></motion.div>
          <motion.div variants={staggerItem}><StatsCard label="Approved This Month" value={completedThisMonth} icon={CheckCircle2} variant="success" /></motion.div>
        </motion.div>

        <div className="mb-6"><StageTimeline title="Production Timeline — Manufacturing & Assembly" /></div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><Factory className="h-4 w-4 text-muted-foreground" /> Production Plans</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate('/pm/production-plans')}>Manage Plans</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {productionPlans.length === 0 && <p className="text-sm text-muted-foreground">No production plans yet.</p>}
            {productionPlans.map((p) => {
              const stages = [...p.manufacturingStages, ...p.assemblingStages];
              const percent = planCompletion(stages);
              const operators = new Set(stages.map((s) => s.operatorId).filter(Boolean)).size;
              return (
                <div key={p.id} className="p-4 rounded-lg border cursor-pointer hover:shadow-sm" onClick={() => navigate('/pm/production-plans')}>
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div>
                      <p className="font-semibold">{p.productName} <span className="font-mono text-[10px] text-muted-foreground">{p.planCode}</span></p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        {p.targetQuantity} units · {p.manufacturingStages.length} machining · {p.assemblingStages.length} assembling
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {operators} operator{operators !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                    <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'IN_PROGRESS' ? 'accent' : p.status === 'SCHEDULED' ? 'warning' : 'slate'}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className={`h-full rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-accent'}`} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>Product Quality Plans</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {productPlans.map(({ product, total, done, percent }) => (
              <div key={product.id} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{total} inspection plan{total !== 1 ? 's' : ''} · {done} completed</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={percent === 100 ? 'success' : 'accent'}>{percent}%</Badge>
                    {acknowledged.has(product.id) ? (
                      <Button size="sm" variant="ghost" disabled className="text-success"><CheckCircle2 className="h-4 w-4" /> Acknowledged</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => acknowledge(product.id, product.name)}>Review & Acknowledge</Button>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-accent rounded-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </PageWrapper>

      <div className="-mt-12">
        <QualityDashboardPage
          title="My Inspection Activity"
          description="All inspection data across your products."
          data={filtered}
          columns={standardColumns('product')}
          exportRows={exportRows}
          fileName="pm-inspections"
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
      </div>

      <InspectionDetailSheet record={detail} onClose={() => setDetail(null)} />
    </>
  );
};
