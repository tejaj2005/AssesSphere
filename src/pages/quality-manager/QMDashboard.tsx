import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Award, FlaskConical, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StageTimeline } from '@/components/shared/StageTimeline';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { relativeTime } from '@/lib/utils';

interface PendingApprovalReport {
  _id: string;
  reportId?: string;
  status: string;
  submittedAt?: string;
  plan?: { title?: string; planType?: string } | null;
  inspector?: { name?: string } | null;
}

interface GapAnalysisSummary {
  _id: string;
  documentName: string;
  standard: string;
  complianceScore?: number;
  analyzedAt: string;
}

interface CapaStatusBucket {
  _id: string;
  count: number;
}

interface QualityDashboardData {
  pendingApprovals: PendingApprovalReport[];
  recentGapAnalyses: GapAnalysisSummary[];
  capaStats: CapaStatusBucket[];
}

const planTypeLabel = (t?: string) =>
  t === 'R3_MANUFACTURING' ? 'Manufacturing' : t === 'R4_ASSEMBLY' ? 'Assembly' : t === 'R2_COMPONENT' ? 'Component' : t === 'R1_MATERIAL' ? 'Material' : t === 'R5_FINAL' ? 'Final Product' : t || '—';

export const QMDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<QualityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const qs = user?.organization ? `?organization=${user.organization}` : '';
        const result = await api.get<QualityDashboardData>(`/dashboard/quality${qs}`);
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled && !silent) toast.error(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Refresh quietly every 20s so a plan/report/evaluation change made elsewhere shows up here
    // without needing to leave and come back to this page.
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

  const { pendingApprovals, recentGapAnalyses, capaStats } = data;
  const totalCapas = capaStats.reduce((sum, s) => sum + s.count, 0);
  const openCapas = capaStats.filter((s) => s._id !== 'COMPLETED' && s._id !== 'VERIFIED').reduce((sum, s) => sum + s.count, 0);
  const closedCapas = totalCapas - openCapas;

  return (
    <PageWrapper>
      <PageHeader title="Quality Manager Dashboard" description="Pending approvals, AI gap analyses and CAPA oversight." />
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Pending Approvals" value={pendingApprovals.length} icon={AlertTriangle} to="/qm/review-reports" variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Gap Analyses" value={recentGapAnalyses.length} icon={FlaskConical} to="/qm/ai-gap-analysis" variant="accent" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Open CAPAs" value={openCapas} icon={ClipboardList} variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Closed CAPAs" value={closedCapas} icon={CheckCircle2} variant="success" /></motion.div>
      </motion.div>
      <div className="mb-4">
        <StageTimeline title="Manufacturing & Assembly Timeline" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Pending Approvals</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {pendingApprovals.length === 0 && <p className="text-sm text-muted-foreground">No reports awaiting approval.</p>}
              {pendingApprovals.map((r) => (
                <li key={r._id} className="p-3 rounded-lg border cursor-pointer hover:shadow-sm" onClick={() => navigate('/qm/review-reports')}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{r.plan?.title || 'Untitled plan'} <span className="font-mono text-[10px] text-muted-foreground">{r.reportId}</span></p>
                    <Badge variant="warning">{r.status}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{planTypeLabel(r.plan?.planType)} · {r.inspector?.name || 'Unassigned'}{r.submittedAt && <> · {relativeTime(r.submittedAt)}</>}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Recent AI Gap Analyses</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentGapAnalyses.length === 0 && <p className="text-sm text-muted-foreground">No gap analyses yet.</p>}
              {recentGapAnalyses.map((g) => (
                <div key={g._id} className="p-3 rounded-lg border flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2 min-w-0">
                    <FlaskConical className="h-4 w-4 shrink-0" />
                    <span className="truncate">{g.documentName} <span className="text-muted-foreground font-normal">· {g.standard}</span></span>
                  </span>
                  <Badge variant={typeof g.complianceScore === 'number' && g.complianceScore >= 80 ? 'success' : 'warning'}>{typeof g.complianceScore === 'number' ? `${g.complianceScore}%` : '—'}</Badge>
                </div>
              ))}
              <div className="p-3 rounded-lg border flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2"><Award className="h-4 w-4" /> Total CAPAs</span>
                <Badge variant="accent">{totalCapas}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};
