import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, CheckCircle2, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTip, ResponsiveContainer, Legend } from 'recharts';
import { ChartTooltip, BarGradient, chartGrid, chartAxisTick, chartAxisLine, chartLegendStyle, barCursor } from '@/components/dashboard/ChartTooltip';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { AIRiskScoreCard } from '@/components/ai/AIRiskScoreCard';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApi';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useChartColors } from '@/lib/chartColors';
import { formatDate, cn } from '@/lib/utils';
import type { SupplierEvaluation, RAGStatus } from '@/types';

// Backend stores 0-10 evaluation scores rather than a GREEN/AMBER/RED enum — derive RAG client-side
// (same thresholds used elsewhere in the app, e.g. src/pages/Suppliers.tsx).
const ragFromScore = (score: number): RAGStatus => (score >= 7 ? 'GREEN' : score >= 4 ? 'AMBER' : 'RED');

/** Backend SupplierEvaluation doc (populated supplier/evaluatedBy/reviewedBy) -> mock SupplierEvaluation shape. */
function toSupplierEvaluation(e: any): SupplierEvaluation {
  const supplier = e.supplier;
  const supplierId = typeof supplier === 'string' ? supplier : (supplier?._id ?? supplier?.id ?? '');
  return {
    id: e.id,
    supplierId,
    supplierName: supplier?.name ?? 'Unknown Supplier',
    evaluationDate: e.evaluationDate,
    qualityRating: e.qualityScore ?? 0,
    deliveryRating: e.deliveryScore ?? 0,
    quantityRating: e.quantityScore ?? 0,
    qualityStatus: ragFromScore(e.qualityScore ?? 0),
    deliveryStatus: ragFromScore(e.deliveryScore ?? 0),
    quantityStatus: ragFromScore(e.quantityScore ?? 0),
    overallStatus: ragFromScore(e.overallScore ?? 0),
    evaluatedBy: e.evaluatedBy?.name ?? '—',
    approvedBy: e.reviewedBy?.name,
    approvalStatus: e.reviewStatus ?? 'PENDING',
    comments: e.remarks,
  };
}

export const SupplierEvalDashboard = () => {
  const { user } = useAuth();
  const organization = user?.organization ?? '';
  const chart = useChartColors();

  const { items: rawEvaluations } = useApiResource<any>('/supplier-evaluations', { organization }, 20000);
  const { items: suppliers } = useApiResource<any>('/admin/suppliers', { organization });

  const supplierEvaluations = useMemo(() => rawEvaluations.map(toSupplierEvaluation), [rawEvaluations]);

  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => supplierEvaluations.filter((e) => {
    if (search && !e.supplierName.toLowerCase().includes(search.toLowerCase())) return false;
    if (supplierFilter !== 'all' && e.supplierId !== supplierFilter) return false;
    if (statusFilter !== 'all' && e.overallStatus !== statusFilter) return false;
    if (from && e.evaluationDate < from) return false;
    if (to && e.evaluationDate > to + 'T23:59:59') return false;
    return true;
  }), [supplierEvaluations, search, supplierFilter, statusFilter, from, to]);

  const green = filtered.filter((e) => e.overallStatus === 'GREEN').length;
  const amber = filtered.filter((e) => e.overallStatus === 'AMBER').length;
  const red   = filtered.filter((e) => e.overallStatus === 'RED').length;

  const comparison = filtered.map((e) => ({
    name: e.supplierName.split(' ')[0],
    Quality: e.qualityRating, Delivery: e.deliveryRating, Quantity: e.quantityRating,
  }));

  const exportRows = filtered.map((e, i) => ({
    No: i + 1, Supplier: e.supplierName, ID: e.supplierId,
    EvalDate: formatDate(e.evaluationDate),
    Quality: `${e.qualityRating}/10 (${e.qualityStatus})`,
    Delivery: `${e.deliveryRating}/10 (${e.deliveryStatus})`,
    Quantity: `${e.quantityRating}/10 (${e.quantityStatus})`,
    ApprovedBy: e.approvedBy || '—', Overall: e.overallStatus,
  }));

  const columns: Column<SupplierEvaluation>[] = [
    { key: 'no', header: 'Sl', cell: (_, i) => <span className="text-xs text-muted-foreground">{i + 1}</span>, width: 'w-12' },
    { key: 'name', header: 'Supplier', sortable: true, sortValue: (e) => e.supplierName, cell: (e) => <span className="font-medium">{e.supplierName}</span> },
    { key: 'id', header: 'ID', cell: (e) => <span className="text-xs font-mono text-muted-foreground">{e.supplierId}</span> },
    { key: 'date', header: 'Eval Date', sortable: true, sortValue: (e) => e.evaluationDate, cell: (e) => <span className="text-xs">{formatDate(e.evaluationDate)}</span> },
    { key: 'q', header: 'Quality', cell: (e) => <div className="flex items-center gap-1.5"><RAGBadge status={e.qualityStatus} label={`${e.qualityRating}/10`} /></div> },
    { key: 'd', header: 'Delivery', cell: (e) => <div className="flex items-center gap-1.5"><RAGBadge status={e.deliveryStatus} label={`${e.deliveryRating}/10`} /></div> },
    { key: 'qty', header: 'Quantity', cell: (e) => <div className="flex items-center gap-1.5"><RAGBadge status={e.quantityStatus} label={`${e.quantityRating}/10`} /></div> },
    { key: 'app', header: 'Approved By', cell: (e) => <span className="text-xs">{e.approvedBy || '—'}</span> },
    { key: 'overall', header: 'Overall', cell: (e) => <RAGBadge status={e.overallStatus} /> },
    { key: 'expand', header: '', width: 'w-12', cell: (e) => (
      <button onClick={(ev) => { ev.stopPropagation(); setExpanded(expanded === e.id ? null : e.id); }} className="p-1.5 rounded hover:bg-muted">
        <ChevronDown className={cn('h-4 w-4 transition-transform', expanded === e.id && 'rotate-180')} />
      </button>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader title="Supplier Evaluation" description="Quarterly supplier quality, delivery and quantity ratings." action={<ExportButtons data={exportRows} fileName="supplier-evaluation" />} />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Total Suppliers" value={filtered.length} icon={Truck} /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Good" value={green} icon={CheckCircle2} variant="success" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Warning" value={amber} icon={AlertTriangle} variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Critical" value={red} icon={XCircle} variant="danger" /></motion.div>
      </motion.div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Supplier Ratings Comparison</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} barCategoryGap="22%">
                <defs>
                  <BarGradient id="sg-quality" color={chart.green} />
                  <BarGradient id="sg-delivery" color={chart.primary} />
                  <BarGradient id="sg-quantity" color={chart.gold} />
                </defs>
                <CartesianGrid {...chartGrid} vertical={false} />
                <XAxis dataKey="name" tick={chartAxisTick} stroke={chartAxisLine} />
                <YAxis tick={chartAxisTick} stroke={chartAxisLine} domain={[0, 10]} />
                <RTip content={<ChartTooltip valueSuffix="/10" />} cursor={barCursor} />
                <Legend wrapperStyle={chartLegendStyle} iconType="circle" />
                <Bar dataKey="Quality"  fill="url(#sg-quality)"  radius={[6,6,0,0]} maxBarSize={44} />
                <Bar dataKey="Delivery" fill="url(#sg-delivery)" radius={[6,6,0,0]} maxBarSize={44} />
                <Bar dataKey="Quantity" fill="url(#sg-quantity)" radius={[6,6,0,0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search supplier…" className="sm:w-72" />
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Select value={supplierFilter} onChange={setSupplierFilter} options={[{ label: 'All Suppliers', value: 'all' }, ...suppliers.map((s: any) => ({ label: s.name, value: s.id }))]} className="w-48" />
        <Select value={statusFilter} onChange={setStatusFilter} options={[{ label: 'All Status', value: 'all' }, { label: 'Good', value: 'GREEN' }, { label: 'Warning', value: 'AMBER' }, { label: 'Critical', value: 'RED' }]} className="w-40" />
      </div>

      <DataTable columns={columns} data={filtered} onRowClick={(e) => setExpanded(expanded === e.id ? null : e.id)} emptyTitle="No evaluations" />

      <AnimatePresence>
        {expanded && (() => {
          const e = filtered.find((x) => x.id === expanded);
          if (!e) return null;
          // Real-data-derived risk inputs: count this supplier's own evaluation history rather
          // than inventing numbers — RED/AMBER evaluations stand in for critical/major findings
          // since supplier evaluations don't carry a separate findings breakdown.
          const supplierHistory = supplierEvaluations.filter((x) => x.supplierId === e.supplierId);
          const supplierRecord = suppliers.find((s: any) => s.id === e.supplierId);
          return (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Card className="mt-4 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{e.supplierName}</h3>
                    <p className="text-sm text-muted-foreground">Evaluated by {e.evaluatedBy} on {formatDate(e.evaluationDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RAGBadge status={e.overallStatus} label={`Overall ${e.overallStatus}`} />
                    <Badge variant={e.approvalStatus === 'APPROVED' ? 'success' : e.approvalStatus === 'REJECTED' ? 'danger' : 'warning'}>{e.approvalStatus}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-3 rounded-lg border"><p className="text-xs uppercase tracking-wider text-muted-foreground">Quality</p><p className="mt-1 text-2xl font-bold">{e.qualityRating}<span className="text-sm text-muted-foreground">/10</span></p><RAGBadge status={e.qualityStatus} /></div>
                  <div className="p-3 rounded-lg border"><p className="text-xs uppercase tracking-wider text-muted-foreground">Delivery</p><p className="mt-1 text-2xl font-bold">{e.deliveryRating}<span className="text-sm text-muted-foreground">/10</span></p><RAGBadge status={e.deliveryStatus} /></div>
                  <div className="p-3 rounded-lg border"><p className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</p><p className="mt-1 text-2xl font-bold">{e.quantityRating}<span className="text-sm text-muted-foreground">/10</span></p><RAGBadge status={e.quantityStatus} /></div>
                </div>
                {e.comments && <div className="mt-4 pt-4 border-t"><p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Evaluator Comments</p><p className="text-sm italic">"{e.comments}"</p></div>}
                <div className="mt-4 pt-4 border-t max-w-xs">
                  <AIRiskScoreCard
                    entityType="SUPPLIER"
                    entityId={e.supplierId}
                    entityName={e.supplierName}
                    historicalData={{
                      totalInspections: Math.max(supplierHistory.length, 1),
                      failedInspections: supplierHistory.filter((x) => x.overallStatus === 'RED').length,
                      criticalFindings: supplierHistory.filter((x) => x.overallStatus === 'RED').length,
                      majorFindings: supplierHistory.filter((x) => x.overallStatus === 'AMBER').length,
                      minorFindings: 0,
                      capaOpenCount: 0,
                      capaOverdueCount: 0,
                      lastInspectionDate: e.evaluationDate,
                      complianceScore: supplierRecord ? Math.round((supplierRecord.overallRating || 0) * 10) : undefined,
                    }}
                  />
                </div>
              </Card>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </PageWrapper>
  );
};
