import { useState, useRef, useMemo } from 'react';
import { Upload, FileText, X, Loader2, Send, Save, History } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

/** Backend Equipment model (server/models/Equipment.ts) — diverges from the old mock
 * InspectionEquipment shape (code -> equipmentId, supplier -> vendorName, calibrationDueDate ->
 * nextCalibrationDate), so a local interface is used instead of the mock `@/types` one. */
interface EquipmentDoc {
  _id: string;
  id: string;
  name: string;
  equipmentId: string;
  type: string;
  vendorName?: string;
  calibrationStatus: 'COMPLETED' | 'PENDING' | 'OVERDUE' | 'NOT_REQUIRED';
  nextCalibrationDate?: string;
  lastCalibrationDate?: string;
  organization?: string;
}

/** Backend CalibrationRecord model (server/models/CalibrationRecord.ts). This page only
 * submits + views the inspector's own history; approve/reject lives on the QM's
 * CalibrationApprovals page. `equipment`/`submittedBy`/`reviewedBy` come back populated. */
interface CalibrationRecordDoc {
  _id: string;
  id: string;
  equipment: { _id: string; name: string; equipmentId: string; type: string } | string;
  calibrationDate: string;
  nextDueDate: string;
  performedBy: string;
  certificate?: string;
  result: 'PASS' | 'FAIL' | 'CONDITIONAL';
  notes?: string;
  organization: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedBy?: { _id: string; name: string } | string;
  reviewedBy?: { _id: string; name: string } | string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
}

const emptyForm = {
  equipmentId: '', lab: '', certNumber: '', standard: '', result: 'PASS' as 'PASS' | 'FAIL' | 'CONDITIONAL',
  calibrationDate: new Date().toISOString().slice(0, 10),
  nextDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  remarks: '', certFile: '',
};

export const CalibrationReport = () => {
  const { user } = useAuth();
  const orgQuery = useMemo(() => ({ organization: user?.organization || '' }), [user?.organization]);
  const { items: equipment, loading: eqpLoading } = useApiResource<EquipmentDoc>('/admin/equipment', orgQuery);
  const { items: records, loading: recLoading, refetch: refetchRecords } = useApiResource<CalibrationRecordDoc>('/admin/calibration-records', orgQuery);

  // Equipment awaiting or overdue for calibration is what an inspector can submit against.
  const eligibleEqp = useMemo(() => equipment.filter((e) => e.calibrationStatus === 'PENDING' || e.calibrationStatus === 'OVERDUE'), [equipment]);

  // The list endpoint returns every submission for the org — narrow to this inspector's own.
  const mySubmissions = useMemo(() => records
    .filter((r) => (typeof r.submittedBy === 'string' ? r.submittedBy : r.submittedBy?._id) === user?.id)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [records, user?.id]);

  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(emptyForm);
  const [certFileObj, setCertFileObj] = useState<File | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);

  const selected = eligibleEqp.find((e) => e.id === form.equipmentId);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setForm({ ...form, certFile: f.name });
    setCertFileObj(f);
    toast.success('Certificate attached');
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async (action: 'draft' | 'submit') => {
    const e: Record<string, string> = {};
    if (!form.equipmentId) e.equipmentId = 'Required';
    if (action === 'submit') {
      if (!form.calibrationDate) e.calibrationDate = 'Required';
      if (!form.lab) e.lab = 'Required';
      if (!form.certNumber) e.certNumber = 'Required';
      if (!form.standard) e.standard = 'Required';
      if (!form.remarks) e.remarks = 'Required';
    }
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(action);

    if (action === 'draft') {
      // CalibrationRecord has no draft state on the backend, so there's genuinely nowhere to
      // save this yet — say so plainly instead of a "Saved" toast that implies it'll still be
      // here after a refresh or a closed tab.
      toast.message("Draft isn't persisted — this form only clears when you Submit or navigate away.");
      setBusy(null);
      return;
    }

    try {
      const notes = [`Calibration Lab: ${form.lab}`, `Standard: ${form.standard}`, form.remarks]
        .filter(Boolean).join('\n');
      const fd = new FormData();
      fd.append('calibrationDate', form.calibrationDate);
      fd.append('nextDueDate', form.nextDue);
      fd.append('performedBy', user?.name || 'Inspector');
      fd.append('certificate', form.certNumber);
      fd.append('result', form.result);
      fd.append('notes', notes);
      if (user?.id) fd.append('submittedBy', user.id);
      if (user?.organization) fd.append('organization', user.organization);
      if (certFileObj) fd.append('certificateFile', certFileObj);
      await api.post(`/admin/equipment/${form.equipmentId}/calibration`, fd);
      toast.success('Calibration report submitted for Quality Manager approval');
      setForm(emptyForm);
      setCertFileObj(null);
      await refetchRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  if (eqpLoading || recLoading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader title="Calibration Report" description="Submit equipment calibration certificates for QM approval." />

      <Card className="p-6 max-w-3xl">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Instrument <span className="text-destructive">*</span></Label>
            <Select value={form.equipmentId} onChange={(v) => setForm({ ...form, equipmentId: v })} error={!!errs.equipmentId}
              options={eligibleEqp.map((e) => ({ label: `${e.name} (${e.equipmentId})`, value: e.id }))} placeholder={eligibleEqp.length ? 'Select pending equipment' : 'No pending calibrations'} />
            {errs.equipmentId && <p className="text-xs text-destructive">{errs.equipmentId}</p>}
          </div>

          {selected && (
            <div className="p-3 rounded-lg border bg-muted/30 text-xs grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Code:</span> <span className="font-mono">{selected.equipmentId}</span></div>
              <div><span className="text-muted-foreground">Due:</span> {selected.nextCalibrationDate ? new Date(selected.nextCalibrationDate).toLocaleDateString() : '—'}</div>
              <div><span className="text-muted-foreground">Supplier:</span> {selected.vendorName || '—'}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Calibration Date <span className="text-destructive">*</span></Label><DatePicker value={form.calibrationDate} onChange={(v) => setForm({ ...form, calibrationDate: v })} />{errs.calibrationDate && <p className="text-xs text-destructive">{errs.calibrationDate}</p>}</div>
            <div className="space-y-1.5"><Label>Next Calibration Due</Label><DatePicker value={form.nextDue} onChange={(v) => setForm({ ...form, nextDue: v })} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Calibration Lab <span className="text-destructive">*</span></Label><Input value={form.lab} error={!!errs.lab} onChange={(e) => { setForm({ ...form, lab: e.target.value }); setErrs({ ...errs, lab: '' }); }} placeholder="e.g., NationalCal" />{errs.lab && <p className="text-xs text-destructive">{errs.lab}</p>}</div>
            <div className="space-y-1.5"><Label>Certificate Number <span className="text-destructive">*</span></Label><Input value={form.certNumber} error={!!errs.certNumber} onChange={(e) => { setForm({ ...form, certNumber: e.target.value }); setErrs({ ...errs, certNumber: '' }); }} placeholder="NC-2026-441" />{errs.certNumber && <p className="text-xs text-destructive">{errs.certNumber}</p>}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Calibration Standard <span className="text-destructive">*</span></Label><Input value={form.standard} error={!!errs.standard} onChange={(e) => { setForm({ ...form, standard: e.target.value }); setErrs({ ...errs, standard: '' }); }} placeholder="ISO 3611" />{errs.standard && <p className="text-xs text-destructive">{errs.standard}</p>}</div>
            <div className="space-y-1.5"><Label>Result</Label>
              <Select value={form.result} onChange={(v) => setForm({ ...form, result: v as 'PASS' | 'FAIL' | 'CONDITIONAL' })} options={[{ label: 'Pass', value: 'PASS' }, { label: 'Fail', value: 'FAIL' }, { label: 'Conditional', value: 'CONDITIONAL' }]} />
            </div>
          </div>

          <div className="space-y-1.5"><Label>Inspector Remarks <span className="text-destructive">*</span></Label><Textarea value={form.remarks} error={!!errs.remarks} onChange={(e) => { setForm({ ...form, remarks: e.target.value }); setErrs({ ...errs, remarks: '' }); }} rows={3} placeholder="Summary of calibration result, any adjustments made…" />{errs.remarks && <p className="text-xs text-destructive">{errs.remarks}</p>}</div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between"><Label>Certificate File</Label><Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Upload</Button><input ref={fileRef} type="file" className="hidden" onChange={handleFile} /></div>
            {form.certFile ? (
              <div className="flex items-center gap-2 p-2 rounded border bg-muted/40 text-sm">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{form.certFile}</span>
                <button onClick={() => { setForm({ ...form, certFile: '' }); setCertFileObj(null); }}><X className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            ) : <div className="p-3 border-2 border-dashed rounded text-xs text-muted-foreground text-center">No certificate uploaded</div>}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => submit('draft')} disabled={busy !== null}>{busy === 'draft' && <Loader2 className="h-4 w-4 animate-spin" />}<Save className="h-4 w-4" /> Save Draft</Button>
            <Button variant="accent" onClick={() => submit('submit')} disabled={busy !== null}>{busy === 'submit' && <Loader2 className="h-4 w-4 animate-spin" />}<Send className="h-4 w-4" /> Submit for QM Approval</Button>
          </div>
        </div>
      </Card>

      <div className="max-w-3xl mt-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><History className="h-4 w-4" /> My Submissions</h3>
        {mySubmissions.length === 0 ? (
          <Card className="p-8"><EmptyState title="No submissions yet" description="Calibration reports you submit will show up here with their approval status." /></Card>
        ) : (
          <div className="space-y-2">
            {mySubmissions.map((r) => {
              const eq = typeof r.equipment === 'string' ? null : r.equipment;
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{eq?.name || 'Equipment'} <span className="text-xs text-muted-foreground font-mono">{eq?.equipmentId}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">Calibrated {formatDate(r.calibrationDate)} · Next due {formatDate(r.nextDueDate)}</p>
                      {r.approvalStatus === 'REJECTED' && r.rejectionReason && <p className="text-xs text-red-700 dark:text-red-400 italic mt-1">"{r.rejectionReason}"</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={r.result === 'PASS' ? 'success' : r.result === 'FAIL' ? 'danger' : 'warning'}>{r.result}</Badge>
                      <Badge variant={r.approvalStatus === 'APPROVED' ? 'success' : r.approvalStatus === 'REJECTED' ? 'danger' : 'warning'}>{r.approvalStatus}</Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};
