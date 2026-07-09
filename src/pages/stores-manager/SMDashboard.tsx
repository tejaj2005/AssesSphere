import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, Factory, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { relativeTime } from '@/lib/utils';

/** Shapes returned by GET /dashboard/stores (see server/routes/dashboard.routes.ts). */
interface SupplierOverviewRow {
  _id: string; // Supplier.approvalStatus
  count: number;
  avgRating: number;
}

interface PendingMaterialPlan {
  _id: string;
  planId: string;
  title: string;
  material?: { _id: string; name: string; materialId: string };
  supplier?: { _id: string; name: string };
  assignedInspectors?: { _id: string; name: string }[];
  dueDate?: string;
  status: string;
}

interface ApprovedVendorRow {
  _id: string;
  name: string;
  supplierId: string;
  category: string;
  approvalStatus: string;
  overallRating: number;
  evaluationCount: number;
}

interface StoresDashboardData {
  supplierOverview: SupplierOverviewRow[];
  pendingMaterialPlans: PendingMaterialPlan[];
  approvedVendors: ApprovedVendorRow[];
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'accent' | 'slate'> = {
  APPROVED: 'success',
  CONDITIONAL: 'accent',
  PENDING: 'warning',
  SUSPENDED: 'warning',
  BLACKLISTED: 'danger',
};

const STATUS_BAR_COLOR: Record<string, string> = {
  APPROVED: 'bg-[#2e9e6b]',
  CONDITIONAL: 'bg-[#3b82f6]',
  PENDING: 'bg-[#f5af12]',
  SUSPENDED: 'bg-[#f5af12]',
  BLACKLISTED: 'bg-[#d9534f]',
};

export const SMDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<StoresDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.organization) return;
    setLoading(true);
    api.get<StoresDashboardData>(`/dashboard/stores?organization=${user.organization}`)
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [user?.organization]);

  if (loading || !data) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  const { supplierOverview, pendingMaterialPlans, approvedVendors } = data;

  const totalSuppliers = supplierOverview.reduce((s, r) => s + r.count, 0);
  const needsAttention = supplierOverview
    .filter((r) => r._id !== 'APPROVED')
    .reduce((s, r) => s + r.count, 0);
  const approvedCount = supplierOverview.find((r) => r._id === 'APPROVED')?.count ?? approvedVendors.length;

  return (
    <PageWrapper>
      <PageHeader title="Stores Manager Dashboard" description="Material inspection, supplier and inventory overview." />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Pending Material Plans" value={pendingMaterialPlans.length} icon={ClipboardList} to="/sm/material-plans" variant="accent" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Approved Vendors" value={approvedCount} icon={Factory} to="/sm/approved-vendors" variant="success" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Total Suppliers" value={totalSuppliers} icon={Package} to="/sm/approved-vendors" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Suppliers Needing Attention" value={needsAttention} icon={AlertTriangle} variant="warning" /></motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Pending Material Plans</CardTitle></CardHeader>
          <CardContent>
            {pendingMaterialPlans.length === 0 && <p className="text-sm text-muted-foreground">No active material inspection plans.</p>}
            <ul className="space-y-2">
              {pendingMaterialPlans.slice(0, 5).map((p) => (
                <li key={p._id} onClick={() => navigate('/sm/material-plans')} className="p-3 rounded-lg border hover:border-accent/40 hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.material?.name || p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.supplier?.name || 'No supplier'} {p.dueDate && <>· due {relativeTime(p.dueDate)}</>}
                      </p>
                    </div>
                    <Badge variant={p.status === 'ACTIVE' ? 'accent' : 'slate'}>{p.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Supplier Overview</CardTitle></CardHeader>
          <CardContent>
            {totalSuppliers === 0 ? (
              <p className="text-sm text-muted-foreground">No suppliers on record.</p>
            ) : (
              <>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-muted shadow-inner mb-3">
                  {supplierOverview.map((r) => (
                    <div
                      key={r._id}
                      className={`${STATUS_BAR_COLOR[r._id] || 'bg-muted-foreground'} transition-all`}
                      style={{ width: `${(r.count / totalSuppliers) * 100}%` }}
                      title={`${r.count} ${r._id}`}
                    />
                  ))}
                </div>
                <ul className="space-y-2">
                  {supplierOverview.map((r) => (
                    <li key={r._id} className="flex items-center justify-between text-sm p-2 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[r._id] || 'slate'}>{r._id}</Badge>
                        <span className="text-muted-foreground">{r.count} supplier{r.count !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">avg {r.avgRating ? r.avgRating.toFixed(1) : '—'}/10</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};
