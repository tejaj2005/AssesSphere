import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pause, X, AlertTriangle, Factory } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { formatDate, cn } from '@/lib/utils';
import type { ApprovedVendor } from '@/types';

export const ApprovedVendors = () => {
  const { suppliers, approvedVendors, supplierEvaluations, addApprovedVendor, updateApprovedVendor } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState({ supplierId: '', servicesDetails: '' });
  const [action, setAction] = useState<{ vendor: ApprovedVendor; type: 'SUSPENDED' | 'REMOVED' } | null>(null);
  const [reason, setReason] = useState('');

  // Only suppliers with at least one APPROVED evaluation are eligible
  const eligibleSuppliers = suppliers.filter((s) => {
    const evals = supplierEvaluations.filter((e) => e.supplierId === s.id);
    const hasApproved = evals.some((e) => e.approvalStatus === 'APPROVED');
    const alreadyListed = approvedVendors.some((v) => v.supplierId === s.id);
    return hasApproved && !alreadyListed;
  });

  const filtered = useMemo(() => approvedVendors.filter((v) => (v.supplierName + v.servicesDetails).toLowerCase().includes(search.toLowerCase())), [approvedVendors, search]);

  // Auto-flag: 3 consecutive ambers OR 1 red
  const recommendRemoval = (vendorSupplierId: string) => {
    const evals = supplierEvaluations.filter((e) => e.supplierId === vendorSupplierId).sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate));
    if (evals.some((e) => e.overallStatus === 'RED')) return true;
    const last3 = evals.slice(0, 3);
    return last3.length === 3 && last3.every((e) => e.overallStatus === 'AMBER');
  };

  const add = () => {
    if (!form.supplierId) { toast.error('Supplier required'); return; }
    const sup = suppliers.find((s) => s.id === form.supplierId)!;
    addApprovedVendor({
      supplierId: sup.id, supplierName: sup.name, supplierCode: sup.code,
      servicesDetails: form.servicesDetails || sup.name + ' services', approvedDate: new Date().toISOString(),
      reviewedBy: user?.name || 'SM', approvedBy: 'Quality Manager', status: 'APPROVED',
    });
    toast.success(`${sup.name} added to approved vendors`);
    setForm({ supplierId: '', servicesDetails: '' });
    setDrawer(false);
  };

  const performAction = () => {
    if (!action) return;
    if (reason.trim().length < 5) { toast.error('Reason required (min 5 chars)'); return; }
    updateApprovedVendor(action.vendor.id, { status: action.type, suspensionReason: reason });
    toast.success(action.type === 'SUSPENDED' ? `${action.vendor.supplierName} suspended` : `${action.vendor.supplierName} removed`);
    setAction(null); setReason('');
  };

  const exportRows = approvedVendors.map((v) => ({ Supplier: v.supplierName, Code: v.supplierCode, Services: v.servicesDetails, ApprovedDate: formatDate(v.approvedDate), Status: v.status, ApprovedBy: v.approvedBy }));

  return (
    <PageWrapper>
      <PageHeader title="Approved Vendors" description="Verified supplier roster for procurement." action={
        <>
          <ExportButtons data={exportRows} fileName="approved-vendors" />
          <Button variant="accent" onClick={() => setDrawer(true)}><Plus className="h-4 w-4" /> Add Vendor</Button>
        </>
      } />

      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search vendors…" className="sm:w-72" /></div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => {
          const flagged = recommendRemoval(v.supplierId);
          return (
            <motion.div key={v.id} variants={staggerItem}>
              <Card className={cn('p-5 hover:shadow-md transition-shadow', v.status === 'REMOVED' && 'opacity-60')}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Factory className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{v.supplierName}</p>
                      <p className="text-xs font-mono text-muted-foreground">{v.supplierCode}</p>
                    </div>
                  </div>
                  <Badge variant={v.status === 'APPROVED' ? 'success' : v.status === 'SUSPENDED' ? 'warning' : 'danger'}>{v.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{v.servicesDetails}</p>
                {flagged && v.status === 'APPROVED' && (
                  <div className="mb-3 p-2 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">Removal recommended based on recent evaluations</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mb-3">
                  Approved {formatDate(v.approvedDate)} by {v.approvedBy}
                </div>
                {v.status === 'APPROVED' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setAction({ vendor: v, type: 'SUSPENDED' }); setReason(''); }}><Pause className="h-3.5 w-3.5" /> Suspend</Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setAction({ vendor: v, type: 'REMOVED' }); setReason(''); }}><X className="h-3.5 w-3.5" /> Remove</Button>
                  </div>
                )}
                {v.suspensionReason && <p className="mt-2 text-xs text-muted-foreground italic">"{v.suspensionReason}"</p>}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetHeader>
          <SheetTitle>Add Vendor to Approved List</SheetTitle>
          <SheetDescription>Only suppliers with an approved QM evaluation are eligible.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Supplier <span className="text-destructive">*</span></Label>
              <Select value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} options={eligibleSuppliers.map((s) => ({ label: s.name, value: s.id }))} placeholder={eligibleSuppliers.length ? 'Select supplier' : 'No eligible suppliers'} />
              {eligibleSuppliers.length === 0 && <p className="text-xs text-muted-foreground">All eligible suppliers are already on the approved list, or have no approved evaluations.</p>}
            </div>
            <div className="space-y-1.5"><Label>Services Details</Label><Textarea value={form.servicesDetails} onChange={(e) => setForm({ ...form, servicesDetails: e.target.value })} rows={3} /></div>
            <p className="text-xs text-muted-foreground">Reviewed by: <span className="font-medium">{user?.name}</span></p>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setDrawer(false)}>Cancel</Button>
          <Button variant="accent" onClick={add}>Add Vendor</Button>
        </SheetFooter>
      </Sheet>

      <Dialog open={!!action} onOpenChange={(o) => !o && (setAction(null), setReason(''))}>
        <DialogHeader><DialogTitle>{action?.type === 'SUSPENDED' ? 'Suspend' : 'Remove'} Vendor</DialogTitle></DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason (min 5 chars)" autoFocus />
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setAction(null); setReason(''); }}>Cancel</Button>
          <Button variant="destructive" onClick={performAction}>Confirm</Button>
        </DialogFooter>
      </Dialog>
    </PageWrapper>
  );
};
