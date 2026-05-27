import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle2, AlertTriangle, Factory, Layers, ClipboardList } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { useData } from '@/context/DataContext';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { formatDate, relativeTime } from '@/lib/utils';

export const SMDashboard = () => {
  const { materialPlans, approvedVendors, stockStatements, supplierEvaluations } = useData();
  const navigate = useNavigate();

  const pending = materialPlans.filter((p) => p.reviewStatus === 'PENDING').length;
  const approved = materialPlans.filter((p) => p.reviewStatus === 'APPROVED').length;
  const totalStock = stockStatements.reduce((s, x) => s + x.totalAvailable, 0);

  return (
    <PageWrapper>
      <PageHeader title="Stores Manager Dashboard" description="Material inspection, supplier and inventory overview." />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Material Plans" value={materialPlans.length} icon={ClipboardList} to="/sm/material-plans" variant="accent" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Pending Reviews" value={pending} icon={AlertTriangle} to="/sm/review-material-reports" variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Approved Vendors" value={approvedVendors.filter((v) => v.status === 'APPROVED').length} icon={Factory} to="/sm/approved-vendors" variant="success" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Total Stock Items" value={stockStatements.length} icon={Package} to="/sm/stock-statement" /></motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Recent Material Plans</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {materialPlans.slice(0, 5).map((p) => (
                <li key={p.id} onClick={() => navigate('/sm/material-plans')} className="p-3 rounded-lg border hover:border-accent/40 hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.materialName}</p>
                      <p className="text-xs text-muted-foreground">{p.supplierName} · {p.quantity} {p.unit} · {relativeTime(p.date)}</p>
                    </div>
                    <Badge variant={p.overallStatus === 'APPROVED' ? 'success' : p.overallStatus === 'REJECTED' ? 'danger' : 'warning'}>{p.overallStatus}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stock Health</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {stockStatements.map((s) => {
                const okPercent = s.totalAvailable ? (s.approvedCount / s.totalAvailable) * 100 : 0;
                return (
                  <li key={s.id} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium">{s.materialName}</p>
                      <Badge variant={okPercent === 100 ? 'success' : okPercent > 70 ? 'accent' : 'warning'}>{okPercent.toFixed(0)}% OK</Badge>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      <div className="bg-emerald-500" style={{ width: `${(s.approvedCount / s.totalAvailable) * 100}%` }} />
                      <div className="bg-amber-500" style={{ width: `${(s.pendingCount / s.totalAvailable) * 100}%` }} />
                      <div className="bg-red-500" style={{ width: `${(s.rejectedCount / s.totalAvailable) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{s.approvedCount} approved · {s.pendingCount} pending · {s.rejectedCount} rejected · {s.unit}</p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};
