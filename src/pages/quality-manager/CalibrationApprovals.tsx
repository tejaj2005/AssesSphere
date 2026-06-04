import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, FileText, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { EmptyState } from '@/components/shared/EmptyState';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { CalibrationApproval } from '@/types';

export const CalibrationApprovals = () => {
  const { calibrationApprovals, equipment, approveCalibration, rejectCalibration } = useData();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [eqpFilter, setEqpFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [pending, setPending] = useState<{ cal: CalibrationApproval; action: 'REJECTED' } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => calibrationApprovals.filter((c) => {
    if (statusFilter !== 'all' && c.approvalStatus !== statusFilter) return false;
    if (eqpFilter !== 'all' && c.equipmentId !== eqpFilter) return false;
    if (from && c.dueDate < from) return false;
    return true;
  }).sort((a, b) => a.approvalStatus === 'PENDING' ? -1 : 1), [calibrationApprovals, statusFilter, eqpFilter, from]);

  const approve = async (c: CalibrationApproval) => {
    setBusy(c.id);
    await new Promise((r) => setTimeout(r, 300));
    approveCalibration(c.id, user?.name || 'QM');
    toast.success(`${c.equipmentName} calibration approved. Equipment active for inspection use.`);
    setBusy(null);
  };

  const reject = async () => {
    if (!pending) return;
    if (comment.trim().length < 10) { toast.error('Comment required (min 10 chars)'); return; }
    setBusy(pending.cal.id);
    await new Promise((r) => setTimeout(r, 300));
    rejectCalibration(pending.cal.id, comment.trim(), user?.name || 'QM');
    toast.success(`${pending.cal.equipmentName} calibration rejected`);
    setComment(''); setPending(null); setBusy(null);
  };

  const exportRows = filtered.map((c) => ({ Equipment: c.equipmentName, Code: c.equipmentCode, Lab: c.calibrationLab, Cert: c.certificateNumber, Standard: c.calibrationStandard, Result: c.result, NextDue: formatDate(c.nextDueDate), Status: c.approvalStatus }));

  const downloadCertificate = (c: CalibrationApproval) => {
    const lines = [
      'EQUIPMENT CALIBRATION CERTIFICATE',
      '==================================',
      '',
      `Equipment:        ${c.equipmentName} (${c.equipmentCode})`,
      `Calibration Lab:  ${c.calibrationLab}`,
      `Certificate No:   ${c.certificateNumber}`,
      `Standard:         ${c.calibrationStandard}`,
      `Result:           ${c.result}`,
      `Next Due:         ${formatDate(c.nextDueDate)}`,
      `Approval Status:  ${c.approvalStatus}`,
      '',
      `Inspector Remarks: ${c.inspectorRemarks}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = c.certificateFileName || `${c.certificateNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${c.certificateFileName || c.certificateNumber}`);
  };

  return (
    <PageWrapper>
      <PageHeader title="Calibration Approvals" description="Review and approve equipment calibration certificates." action={<ExportButtons data={exportRows} fileName="calibration-approvals" />} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[{ label: 'All', value: 'all' }, { label: 'Pending', value: 'PENDING' }, { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' }]} className="w-40" />
        <Select value={eqpFilter} onChange={setEqpFilter} options={[{ label: 'All Equipment', value: 'all' }, ...equipment.map((e) => ({ label: e.name, value: e.id }))]} className="w-56" />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12"><EmptyState title="No calibration approvals" description="All caught up." /></Card>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <motion.div key={c.id} variants={staggerItem}>
              <Card className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.equipmentName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.equipmentCode}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={c.result === 'PASS' ? 'success' : 'danger'}>{c.result}</Badge>
                    <Badge variant={c.approvalStatus === 'APPROVED' ? 'success' : c.approvalStatus === 'REJECTED' ? 'danger' : 'warning'}>{c.approvalStatus}</Badge>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div><dt className="text-muted-foreground uppercase tracking-wider text-[10px]">Lab</dt><dd className="mt-0.5">{c.calibrationLab}</dd></div>
                  <div><dt className="text-muted-foreground uppercase tracking-wider text-[10px]">Certificate</dt><dd className="mt-0.5 font-mono">{c.certificateNumber}</dd></div>
                  <div><dt className="text-muted-foreground uppercase tracking-wider text-[10px]">Standard</dt><dd className="mt-0.5">{c.calibrationStandard}</dd></div>
                  <div><dt className="text-muted-foreground uppercase tracking-wider text-[10px]">Next Due</dt><dd className="mt-0.5 inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(c.nextDueDate)}</dd></div>
                </dl>

                <p className="text-xs text-muted-foreground mb-3 italic">"{c.inspectorRemarks}"</p>
                <button type="button" onClick={() => downloadCertificate(c)} className="inline-flex items-center gap-1 text-xs text-accent hover:underline mb-3"><FileText className="h-3 w-3" /> {c.certificateFileName}</button>

                {c.approvalStatus === 'PENDING' ? (
                  <div className="flex gap-2 pt-3 border-t">
                    <Button size="sm" variant="accent" disabled={busy === c.id} onClick={() => approve(c)} className="flex-1">{busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve</Button>
                    <Button size="sm" variant="destructive" disabled={busy === c.id} onClick={() => setPending({ cal: c, action: 'REJECTED' })} className="flex-1"><XCircle className="h-4 w-4" /> Reject</Button>
                  </div>
                ) : c.approvalStatus === 'APPROVED' ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 pt-3 border-t">✓ Approved by {c.approvedBy} on {formatDate(c.approvedDate!)}</p>
                ) : (
                  <div className="p-2 rounded bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mt-3"><p className="text-xs text-red-700 dark:text-red-400">Rejected: {c.rejectionComment}</p></div>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={!!pending} onOpenChange={(o) => !o && (setPending(null), setComment(''))}>
        <DialogHeader>
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><DialogTitle>Reject Calibration</DialogTitle><DialogDescription className="mt-1.5">Explain why this calibration is being rejected (min 10 chars).</DialogDescription></div></div>
        </DialogHeader>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} autoFocus />
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setPending(null); setComment(''); }}>Cancel</Button>
          <Button variant="destructive" onClick={reject} disabled={comment.trim().length < 10}>Confirm Rejection</Button>
        </DialogFooter>
      </Dialog>
    </PageWrapper>
  );
};
