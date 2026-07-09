import { useState, useMemo } from 'react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/SearchInput';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { ReviewQueue, ReviewRecord } from '@/components/review/ReviewQueue';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import type { RAGStatus, ReviewStatus } from '@/types';

/** Backend InspectionReport.status → the mock's simpler PENDING/APPROVED/REJECTED/INFO_REQUESTED.
 * DRAFT/SUBMITTED/UNDER_REVIEW all collapse to PENDING; ON_HOLD is the closest match for
 * "more information requested" (see GUIDE's InspectionReport mapping note). */
const toReviewStatus = (status: string): ReviewStatus => {
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'ON_HOLD') return 'INFO_REQUESTED';
  return 'PENDING';
};

const resultToRag = (result: string): RAGStatus => (result === 'FAIL' ? 'RED' : result === 'MARGINAL' ? 'AMBER' : 'GREEN');

/** Maps a populated InspectionReport (plan/inspector/reviewedBy/approvedBy populated by the
 * GET /inspection-reports list route) into the shape ReviewQueue renders. The list endpoint
 * only populates `plan` with {planId,title,planType} — not product/stage/component — so the
 * plan's title is used as the record's main label instead of a product/stage name. */
const toReviewRecord = (r: any): ReviewRecord => {
  const rows = (r.checklistResults || []).map((c: any) => ({
    parameter: c.parameter,
    targetValue: c.specificationValue,
    actualValue: c.actualValue,
    variance: c.variancePercent ?? 0,
    status: resultToRag(c.result),
  }));
  const variance = rows.length ? rows.reduce((s: number, x: any) => s + Math.abs(x.variance), 0) / rows.length : 0;
  const status: RAGStatus = rows.some((x: any) => x.status === 'RED') ? 'RED' : rows.some((x: any) => x.status === 'AMBER') ? 'AMBER' : 'GREEN';
  return {
    id: r.id,
    date: r.inspectionDate,
    title: r.plan?.title || 'Untitled Plan',
    planCode: r.plan?.planId,
    rows,
    variance,
    status,
    inspectorName: r.inspector?.name || 'Unknown Inspector',
    reviewStatus: toReviewStatus(r.status),
    observations: r.observations,
    reviewComment: r.reviewComments || r.rejectionReason,
    reviewedBy: r.approvedBy?.name || r.reviewedBy?.name,
    reviewedDate: r.approvedAt || r.reviewedAt,
  };
};

export const ReviewReports = () => {
  const { user } = useAuth();
  // limit=200: the list route paginates (default 20) — pull a generous page so the
  // review queue isn't silently truncated.
  const { items: reports, loading, refetch } = useApiResource<any>('/inspection-reports', { organization: user?.organization || '', limit: '200' });

  const [tab, setTab] = useState<'mfg' | 'asm' | 'comp'>('mfg');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('PENDING');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Options for the plan filter — derived from whatever reports are currently loaded
  // (no separate /inspection-plans fetch needed, since the report list already populates
  // plan {_id, planId, title, planType}).
  const planOptions = useMemo(() => {
    const map = new Map<string, string>();
    reports.forEach((r: any) => {
      const pid = r.plan?._id;
      if (pid && !map.has(pid)) map.set(pid, r.plan.title || pid);
    });
    return Array.from(map, ([value, label]) => ({ label, value }));
  }, [reports]);

  const filterFn = (planType: string) => reports.filter((r: any) => {
    if (r.plan?.planType !== planType) return false;
    if (planFilter !== 'all' && r.plan?._id !== planFilter) return false;
    if (statusFilter !== 'all' && toReviewStatus(r.status) !== statusFilter) return false;
    const searchText = `${r.plan?.title || ''} ${r.plan?.planId || ''} ${r.inspector?.name || ''} ${(r.checklistResults || []).map((c: any) => c.parameter).join(' ')}`.toLowerCase();
    if (search && !searchText.includes(search.toLowerCase())) return false;
    if (from && r.inspectionDate < from) return false;
    if (to && r.inspectionDate > to + 'T23:59:59') return false;
    return true;
  });

  const mfg = useMemo(() => filterFn('R3_MANUFACTURING').map(toReviewRecord), [reports, planFilter, statusFilter, search, from, to]);
  const asm = useMemo(() => filterFn('R4_ASSEMBLY').map(toReviewRecord), [reports, planFilter, statusFilter, search, from, to]);
  const comp = useMemo(() => filterFn('R2_COMPONENT').map(toReviewRecord), [reports, planFilter, statusFilter, search, from, to]);

  const all = tab === 'mfg' ? mfg : tab === 'asm' ? asm : comp;
  const exportRows = all.map((r) => ({ Plan: r.title, Inspector: r.inspectorName, Date: formatDate(r.date), Variance: `${r.variance.toFixed(2)}%`, Status: r.status, Review: r.reviewStatus }));

  const mfgPending = mfg.filter((r) => r.reviewStatus === 'PENDING').length;
  const asmPending = asm.filter((r) => r.reviewStatus === 'PENDING').length;
  const compPending = comp.filter((r) => r.reviewStatus === 'PENDING').length;

  if (loading && !reports.length) {
    return (
      <PageWrapper>
        <PageHeader title="Review Inspection Reports" description="Approve, reject or request more information on inspection reports." />
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading reports…</Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader title="Review Inspection Reports" description="Approve, reject or request more information on inspection reports." action={<ExportButtons data={exportRows} fileName="review-reports" />} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="mfg">Manufacturing ({mfgPending})</TabsTrigger>
          <TabsTrigger value="asm">Assembling ({asmPending})</TabsTrigger>
          <TabsTrigger value="comp">Components ({compPending})</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-3 my-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
          <Select value={planFilter} onChange={setPlanFilter} options={[{ label: 'All Plans', value: 'all' }, ...planOptions]} className="w-48" />
          <Select value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[{ label: 'All Status', value: 'all' }, { label: 'Pending', value: 'PENDING' }, { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' }, { label: 'Info Requested', value: 'INFO_REQUESTED' }]} className="w-44" />
          <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        </div>

        <TabsContent value="mfg"><ReviewQueue records={mfg} onActionComplete={refetch} /></TabsContent>
        <TabsContent value="asm"><ReviewQueue records={asm} onActionComplete={refetch} /></TabsContent>
        <TabsContent value="comp"><ReviewQueue records={comp} onActionComplete={refetch} /></TabsContent>
      </Tabs>
    </PageWrapper>
  );
};
