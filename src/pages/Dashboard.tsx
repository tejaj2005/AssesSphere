import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTip, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts';
import { ChartTooltip, chartGrid, chartAxisTick, chartAxisLine, chartLegendStyle, barCursor } from '@/components/dashboard/ChartTooltip';
import { ClipboardList, CheckCircle2, Clock, XCircle, Percent, Wrench, ShieldAlert } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useChartColors } from '@/lib/chartColors';

interface DashboardKpis {
  totalInspections: number;
  approvedCount: number;
  pendingReview: number;
  rejectedCount: number;
  approvalRate: number;
}

interface MonthlyTrendPoint {
  _id: { month: number; year: number };
  count: number;
  approved: number;
  failed: number;
}

interface StatusCount {
  _id: string;
  count: number;
}

interface RiskScoreItem {
  _id: string;
  entityType: string;
  entityName: string;
  overallScore: number;
  riskLevel: string;
  calculatedAt: string;
}

interface ManagementDashboardData {
  kpis: DashboardKpis;
  monthlyTrend: MonthlyTrendPoint[];
  statusDistribution: StatusCount[];
  topRiskScores: RiskScoreItem[];
  equipmentCalibration: StatusCount[];
  productQualityStatus: StatusCount[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ON_HOLD: 'On Hold',
};

const RISK_LEVEL_STYLES: Record<string, string> = {
  CRITICAL: 'text-danger',
  HIGH: 'text-warning',
  MEDIUM: 'text-brand-600 dark:text-brand-400',
  LOW: 'text-success',
};

export const Dashboard = () => {
  const { user } = useAuth();
  const chart = useChartColors();

  const [dashboard, setDashboard] = useState<ManagementDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const qs = user?.organization ? `?organization=${user.organization}` : '';
    const load = (silent = false) => {
      if (!silent) setLoading(true);
      api.get<ManagementDashboardData>(`/dashboard/management${qs}`)
        .then((data) => { if (active) setDashboard(data); })
        .catch((e) => { if (!silent) toast.error(e instanceof Error ? e.message : 'Something went wrong'); })
        .finally(() => { if (active) setLoading(false); });
    };
    load();
    // Refresh quietly every 20s so activity from other roles shows up on the Dashboard's
    // activity feed and stats without needing to leave and come back to this page.
    const interval = setInterval(() => load(true), 20000);
    return () => { active = false; clearInterval(interval); };
  }, [user?.organization]);

  const kpis: DashboardKpis = dashboard?.kpis ?? { totalInspections: 0, approvedCount: 0, pendingReview: 0, rejectedCount: 0, approvalRate: 0 };

  const calibrationPending = (dashboard?.equipmentCalibration ?? [])
    .filter((e) => e._id === 'PENDING' || e._id === 'OVERDUE')
    .reduce((sum, e) => sum + e.count, 0);

  const qualityAtRisk = (dashboard?.productQualityStatus ?? [])
    .filter((p) => p._id === 'RED' || p._id === 'AMBER')
    .reduce((sum, p) => sum + p.count, 0);

  const trendData = (dashboard?.monthlyTrend ?? []).map((m) => ({
    name: `${MONTH_NAMES[(m._id.month || 1) - 1]} '${String(m._id.year).slice(-2)}`,
    Total: m.count,
    Approved: m.approved,
    Failed: m.failed,
  }));

  const statusColors: Record<string, string> = {
    DRAFT: chart.grey,
    SUBMITTED: chart.azure,
    UNDER_REVIEW: chart.gold,
    APPROVED: chart.green,
    REJECTED: chart.red,
    ON_HOLD: chart.goldHover,
  };
  const statusData = (dashboard?.statusDistribution ?? []).map((s) => ({
    name: STATUS_LABELS[s._id] || s._id,
    value: s.count,
    color: statusColors[s._id] || chart.grey,
  }));

  const topRisks = dashboard?.topRiskScores ?? [];

  return (
    <PageWrapper loading={loading}>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Here's what's happening with your quality system today."
      />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Total Inspections" value={kpis.totalInspections} icon={ClipboardList} variant="accent" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Approved" value={kpis.approvedCount} icon={CheckCircle2} variant="success" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Pending Review" value={kpis.pendingReview} icon={Clock} variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Rejected" value={kpis.rejectedCount} icon={XCircle} variant="danger" /></motion.div>
      </motion.div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Approval Rate %" value={kpis.approvalRate} icon={Percent} /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Equipment Needing Calibration" value={calibrationPending} icon={Wrench} to="/admin/equipment" variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Quality Plans At Risk" value={qualityAtRisk} icon={ShieldAlert} variant="danger" /></motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Inspection Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid {...chartGrid} vertical={false} />
                  <XAxis dataKey="name" tick={chartAxisTick} stroke={chartAxisLine} />
                  <YAxis tick={chartAxisTick} stroke={chartAxisLine} allowDecimals={false} />
                  <RTip content={<ChartTooltip />} cursor={barCursor} />
                  <Legend wrapperStyle={chartLegendStyle} iconType="circle" />
                  <Bar dataKey="Total" fill={chart.primary} radius={[6, 6, 0, 0]} animationDuration={800} maxBarSize={40} />
                  <Bar dataKey="Approved" fill={chart.green} radius={[6, 6, 0, 0]} animationDuration={800} maxBarSize={40} />
                  <Bar dataKey="Failed" fill={chart.red} radius={[6, 6, 0, 0]} animationDuration={800} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4} cornerRadius={6} stroke="hsl(var(--card))" strokeWidth={2}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RTip content={<ChartTooltip hideLabel />} />
                  <Legend wrapperStyle={chartLegendStyle} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Top Risk Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[360px] overflow-y-auto scrollbar-thin -mx-2">
            {topRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-6 text-center">No risk scores available yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {topRisks.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 py-3 px-2 hover:bg-muted/40 rounded-md transition-colors">
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
                      <ShieldAlert className={`h-3.5 w-3.5 ${RISK_LEVEL_STYLES[r.riskLevel] || 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{r.entityName}</span>{' '}
                        <span className="text-muted-foreground">({r.entityType.toLowerCase()})</span>{' '}
                        <span className={`font-medium ${RISK_LEVEL_STYLES[r.riskLevel] || ''}`}>{r.riskLevel}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Score {r.overallScore}/100 &middot; {relativeTime(r.calculatedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
};
