import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ClockIcon, CheckCircle2, FileCheck, ListChecks } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StageTimeline } from '@/components/shared/StageTimeline';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface PlanStatBucket {
  _id: string;
  count: number;
}

interface DashboardReport {
  _id: string;
  reportId?: string;
  status: string;
  submittedAt?: string;
  updatedAt?: string;
  plan?: { title?: string; planType?: string } | null;
  inspector?: { name?: string } | null;
}

interface ProductionDashboardData {
  planStats: PlanStatBucket[];
  pendingReports: DashboardReport[];
  recentReports: DashboardReport[];
  pendingCount: number;
  approvedThisMonthCount: number;
}

const planTypeLabel = (t?: string) =>
  t === 'R3_MANUFACTURING' ? 'Manufacturing' : t === 'R4_ASSEMBLY' ? 'Assembly' : t || '—';

export const PMDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ProductionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const qs = user?.organization ? `?organization=${user.organization}` : '';
        const result = await api.get<ProductionDashboardData>(`/dashboard/production${qs}`);
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled && !silent) toast.error(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Refresh quietly every 20s so a plan/report change made elsewhere (another role, another
    // tab) shows up here without needing to leave and come back to this page.
    const interval = setInterval(() => load(true), 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.organization]);

  if (loading || !data) {
    return (
      <PageWrapper>
        <LoadingSkeleton />
      </PageWrapper>
    );
  }

  const { planStats, pendingReports, recentReports, pendingCount, approvedThisMonthCount } = data;

  const totalPlans = planStats.reduce((sum, s) => sum + s.count, 0);
  const activePlans = planStats.find((s) => s._id === 'ACTIVE')?.count || 0;
  // True counts from the backend, not `.length` of the capped "recent items" lists below
  // (those stay capped at 10 on purpose — they're just the preview list, not the KPI source).
  const pending = pendingCount;
  const approvedThisMonth = approvedThisMonthCount;

  return (
    <>
      <PageWrapper>
        <PageHeader title="Production Manager Dashboard" description="Overview of manufacturing & assembly plans and pending reviews." />

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div variants={staggerItem}><StatsCard label="Total Plans" value={totalPlans} icon={ListChecks} variant="accent" /></motion.div>
          <motion.div variants={staggerItem}><StatsCard label="Active Plans" value={activePlans} icon={ClipboardList} variant="success" /></motion.div>
          <motion.div variants={staggerItem}><StatsCard label="Pending Reviews" value={pending} icon={ClockIcon} variant="warning" /></motion.div>
          <motion.div variants={staggerItem}><StatsCard label="Approved This Month" value={approvedThisMonth} icon={CheckCircle2} variant="success" /></motion.div>
        </motion.div>

        <div className="mb-6"><StageTimeline title="Production Timeline — Manufacturing & Assembly" /></div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><FileCheck className="h-4 w-4 text-muted-foreground" /> Pending Report Reviews</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate('/pm/review-reports')}>Review Reports</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingReports.length === 0 && <p className="text-sm text-muted-foreground">No reports awaiting review.</p>}
            {pendingReports.map((r) => (
              <div key={r._id} className="p-4 rounded-lg border cursor-pointer hover:shadow-sm" onClick={() => navigate('/pm/review-reports')}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold">{r.plan?.title || 'Untitled plan'} <span className="font-mono text-[10px] text-muted-foreground">{r.reportId}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {planTypeLabel(r.plan?.planType)} · {r.inspector?.name || 'Unassigned'}
                      {r.submittedAt && <> · Submitted {formatDate(r.submittedAt)}</>}
                    </p>
                  </div>
                  <Badge variant="warning">Submitted</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>Recent Report Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentReports.length === 0 && <p className="text-sm text-muted-foreground">No recent report activity.</p>}
            {recentReports.map((r) => (
              <div key={r._id} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold">{r.plan?.title || 'Untitled plan'} <span className="font-mono text-[10px] text-muted-foreground">{r.reportId}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {planTypeLabel(r.plan?.planType)}
                      {r.updatedAt && <> · Updated {formatDate(r.updatedAt)}</>}
                    </p>
                  </div>
                  <Badge variant={r.status === 'APPROVED' ? 'success' : 'danger'}>{r.status === 'APPROVED' ? 'Approved' : 'Rejected'}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </PageWrapper>
    </>
  );
};
