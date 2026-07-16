import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pause, X, AlertTriangle, Factory } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { formatDate, cn } from '@/lib/utils';

type SupplierApprovalStatus = 'APPROVED' | 'PENDING' | 'CONDITIONAL' | 'SUSPENDED' | 'BLACKLISTED';

interface ApprovedSupplier {
  _id: string;
  id: string;
  name: string;
  supplierId: string;
  category: string;
  approvalStatus: SupplierApprovalStatus;
  overallRating: number;
  qualityRating: number;
  deliveryRating: number;
  evaluationCount: number;
  lastEvaluationDate?: string;
  contactPerson?: string;
  notes?: string;
  organization: string;
}

export const ApprovedVendors = () => {
  const { user } = useAuth();
  const query = user?.organization ? { organization: user.organization } : undefined;
  const { items: approvedVendors, loading, setItems } = useApiResource<ApprovedSupplier>('/supplier-evaluations/approved-vendors', query);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<{ vendor: ApprovedSupplier; type: 'SUSPENDED' | 'BLACKLISTED' } | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () => approvedVendors.filter((v) => (v.name + (v.category || '') + (v.supplierId || '')).toLowerCase().includes(search.toLowerCase())),
    [approvedVendors, search]
  );

  // Flag vendors whose rolled-up rating has slipped, based on live evaluation rollups on the Supplier record.
  const isFlagged = (v: ApprovedSupplier) => v.evaluationCount > 0 && v.overallRating < 4;

  const performAction = async () => {
    if (!action) return;
    if (reason.trim().length < 5) { toast.error('Reason required (min 5 chars)'); return; }
    setSaving(true);
    try {
      const notes = [action.vendor.notes, reason].filter(Boolean).join(' | ');
      await api.put(`/admin/suppliers/${action.vendor.id}`, { approvalStatus: action.type, notes });
      // No longer APPROVED, so it drops out of this approved-vendors view.
      setItems((prev) => prev.filter((v) => v.id !== action.vendor.id));
      toast.success(action.type === 'SUSPENDED' ? `${action.vendor.name} suspended` : `${action.vendor.name} removed`);
      setAction(null); setReason('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const exportRows = approvedVendors.map((v) => ({
    Supplier: v.name, Code: v.supplierId, Category: v.category, Rating: v.overallRating,
    Evaluations: v.evaluationCount, LastEvaluation: v.lastEvaluationDate ? formatDate(v.lastEvaluationDate) : '', Status: v.approvalStatus,
  }));

  return (
    <PageWrapper>
      <PageHeader title="Approved Vendors" description="Verified supplier roster for procurement, sourced live from supplier evaluations." action={
        <ExportButtons data={exportRows} fileName="approved-vendors" />
      } />

      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search vendors…" className="sm:w-72" /></div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading approved vendors…</p>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => {
            const flagged = isFlagged(v);
            return (
              <motion.div key={v.id} variants={staggerItem}>
                <Card className={cn('p-5 hover:shadow-md transition-shadow', v.approvalStatus !== 'APPROVED' && 'opacity-60')}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Factory className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{v.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{v.supplierId}</p>
                      </div>
                    </div>
                    <Badge variant={v.approvalStatus === 'APPROVED' ? 'success' : v.approvalStatus === 'SUSPENDED' ? 'warning' : 'danger'}>{v.approvalStatus}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{v.category}{v.evaluationCount ? ` · Rating ${v.overallRating.toFixed(1)}/10 (${v.evaluationCount} evals)` : ''}</p>
                  {flagged && v.approvalStatus === 'APPROVED' && (
                    <div className="mb-3 p-2 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">Removal recommended based on recent evaluations</p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mb-3">
                    {v.lastEvaluationDate ? `Last evaluated ${formatDate(v.lastEvaluationDate)}` : 'No evaluations on record'}
                  </div>
                  {v.approvalStatus === 'APPROVED' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setAction({ vendor: v, type: 'SUSPENDED' }); setReason(''); }}><Pause className="h-3.5 w-3.5" /> Suspend</Button>
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setAction({ vendor: v, type: 'BLACKLISTED' }); setReason(''); }}><X className="h-3.5 w-3.5" /> Remove</Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No approved vendors found.</p>}
        </motion.div>
      )}

      <Dialog open={!!action} onOpenChange={(o) => !o && (setAction(null), setReason(''))}>
        <DialogHeader><DialogTitle>{action?.type === 'SUSPENDED' ? 'Suspend' : 'Remove'} Vendor</DialogTitle></DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason (min 5 chars)" autoFocus />
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setAction(null); setReason(''); }}>Cancel</Button>
          <Button variant="destructive" onClick={performAction} disabled={saving}>Confirm</Button>
        </DialogFooter>
      </Dialog>
    </PageWrapper>
  );
};
