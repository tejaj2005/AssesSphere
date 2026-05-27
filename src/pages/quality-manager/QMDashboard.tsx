import { motion } from 'framer-motion';
import { ClipboardList, Award, FlaskConical, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StageTimeline } from '@/components/shared/StageTimeline';
import { useData } from '@/context/DataContext';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { relativeTime } from '@/lib/utils';

export const QMDashboard = () => {
  const { qualityPlans, calibrationApprovals, inspectionRecords, inspectionReports, supplierEvaluations } = useData();
  const pendingCalibrations = calibrationApprovals.filter((c) => c.approvalStatus === 'PENDING').length;
  const pendingReports = inspectionReports.filter((r) => r.reportStatus === 'L1_APPROVED' || r.reportStatus === 'SUBMITTED').length;
  const completedPlans = qualityPlans.filter((p) => p.status === 'COMPLETED').length;
  const inProgressPlans = qualityPlans.filter((p) => p.status === 'IN_PROGRESS').length;

  return (
    <PageWrapper>
      <PageHeader title="Quality Manager Dashboard" description="Quality plans, approvals and inspection oversight." />
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Quality Plans" value={qualityPlans.length} icon={ClipboardList} to="/qm/quality-plans" variant="accent" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="In Progress" value={inProgressPlans} icon={Award} variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Pending Approvals" value={pendingReports + pendingCalibrations} icon={AlertTriangle} to="/qm/review-reports" variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Completed" value={completedPlans} icon={CheckCircle2} variant="success" /></motion.div>
      </motion.div>
      <div className="mb-4">
        <StageTimeline title="Manufacturing & Assembly Timeline" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Quality Plans Progress</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {qualityPlans.map((p) => (
                <li key={p.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2"><p className="font-medium text-sm">{p.productName}</p><Badge variant={p.status === 'COMPLETED' ? 'success' : p.pmAcknowledged ? 'accent' : 'warning'}>{p.completionPercentage}%</Badge></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${p.completionPercentage}%` }} transition={{ duration: 0.6 }} className="h-full bg-accent rounded-full" /></div>
                  <p className="text-[10px] text-muted-foreground mt-1">{p.manufacturingStages.length} mfg + {p.assemblingStages.length} asm stages · {p.pmAcknowledged ? 'PM Acknowledged' : 'Awaiting PM ack'}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pending Approvals Snapshot</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border flex items-center justify-between"><span className="text-sm font-medium flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Calibrations</span><Badge variant="warning">{pendingCalibrations}</Badge></div>
              <div className="p-3 rounded-lg border flex items-center justify-between"><span className="text-sm font-medium flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Inspection Reports</span><Badge variant="warning">{pendingReports}</Badge></div>
              <div className="p-3 rounded-lg border flex items-center justify-between"><span className="text-sm font-medium flex items-center gap-2"><Award className="h-4 w-4" /> Supplier Evaluations</span><Badge variant="warning">{supplierEvaluations.filter((e) => e.approvalStatus === 'PENDING').length}</Badge></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};
