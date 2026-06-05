import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, Send, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';

export const CalibrationReport = () => {
  const { equipment, addCalibrationApproval, addInspectionReport } = useData();
  const { user } = useAuth();
  const pendingEqp = equipment.filter((e) => e.calibrationStatus === 'PENDING');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    equipmentId: '', lab: '', certNumber: '', standard: '', result: 'PASS' as 'PASS' | 'FAIL',
    nextDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10), remarks: '', certFile: '',
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);

  const selected = equipment.find((e) => e.id === form.equipmentId);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setForm({ ...form, certFile: f.name });
    toast.success('Certificate uploaded');
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async (action: 'draft' | 'submit') => {
    const e: Record<string, string> = {};
    if (!form.equipmentId) e.equipmentId = 'Required';
    if (action === 'submit') {
      if (!form.lab) e.lab = 'Required';
      if (!form.certNumber) e.certNumber = 'Required';
      if (!form.standard) e.standard = 'Required';
      if (!form.remarks) e.remarks = 'Required';
    }
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(action);
    await new Promise((r) => setTimeout(r, 300));
    const eq = selected!;
    if (action === 'submit') {
      addCalibrationApproval({
        equipmentId: eq.id, equipmentName: eq.name, equipmentCode: eq.code, dueDate: eq.calibrationDueDate,
        calibrationLab: form.lab, certificateNumber: form.certNumber, calibrationStandard: form.standard,
        result: form.result, nextDueDate: form.nextDue, inspectorRemarks: form.remarks,
        certificateFileName: form.certFile || 'cert.pdf', approvalStatus: 'PENDING',
      });
      addInspectionReport({
        reportCode: `IR-CAL-${Date.now().toString().slice(-4)}`, type: 'CALIBRATION', productName: eq.name,
        parameters: [], observations: form.remarks, evidenceFiles: form.certFile ? [form.certFile] : [],
        overallStatus: form.result === 'PASS' ? 'APPROVED' : 'REJECTED',
        inspectorId: user?.id || '', inspectorName: user?.name || 'Inspector',
        inspectionDate: new Date().toISOString(), submittedDate: new Date().toISOString(), reportStatus: 'SUBMITTED',
      });
      toast.success('Calibration report submitted for Quality Manager approval');
      setForm({ equipmentId: '', lab: '', certNumber: '', standard: '', result: 'PASS', nextDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10), remarks: '', certFile: '' });
    } else {
      toast.success('Saved as draft');
    }
    setBusy(null);
  };

  return (
    <PageWrapper>
      <PageHeader title="Calibration Report" description="Submit equipment calibration certificates for QM approval." />

      <Card className="p-6 max-w-3xl">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Instrument <span className="text-destructive">*</span></Label>
            <Select value={form.equipmentId} onChange={(v) => setForm({ ...form, equipmentId: v })} error={!!errs.equipmentId}
              options={pendingEqp.map((e) => ({ label: `${e.name} (${e.code})`, value: e.id }))} placeholder={pendingEqp.length ? 'Select pending equipment' : 'No pending calibrations'} />
            {errs.equipmentId && <p className="text-xs text-destructive">{errs.equipmentId}</p>}
          </div>

          {selected && (
            <div className="p-3 rounded-lg border bg-muted/30 text-xs grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Code:</span> <span className="font-mono">{selected.code}</span></div>
              <div><span className="text-muted-foreground">Due:</span> {new Date(selected.calibrationDueDate).toLocaleDateString()}</div>
              <div><span className="text-muted-foreground">Supplier:</span> {selected.supplier}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Calibration Lab <span className="text-destructive">*</span></Label><Input value={form.lab} error={!!errs.lab} onChange={(e) => { setForm({ ...form, lab: e.target.value }); setErrs({ ...errs, lab: '' }); }} placeholder="e.g., NationalCal" />{errs.lab && <p className="text-xs text-destructive">{errs.lab}</p>}</div>
            <div className="space-y-1.5"><Label>Certificate Number <span className="text-destructive">*</span></Label><Input value={form.certNumber} error={!!errs.certNumber} onChange={(e) => { setForm({ ...form, certNumber: e.target.value }); setErrs({ ...errs, certNumber: '' }); }} placeholder="NC-2026-441" />{errs.certNumber && <p className="text-xs text-destructive">{errs.certNumber}</p>}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Calibration Standard <span className="text-destructive">*</span></Label><Input value={form.standard} error={!!errs.standard} onChange={(e) => { setForm({ ...form, standard: e.target.value }); setErrs({ ...errs, standard: '' }); }} placeholder="ISO 3611" />{errs.standard && <p className="text-xs text-destructive">{errs.standard}</p>}</div>
            <div className="space-y-1.5"><Label>Result</Label>
              <Select value={form.result} onChange={(v) => setForm({ ...form, result: v as 'PASS' | 'FAIL' })} options={[{ label: 'Pass', value: 'PASS' }, { label: 'Fail', value: 'FAIL' }]} />
            </div>
          </div>

          <div className="space-y-1.5"><Label>Next Calibration Due</Label><DatePicker value={form.nextDue} onChange={(v) => setForm({ ...form, nextDue: v })} /></div>

          <div className="space-y-1.5"><Label>Inspector Remarks <span className="text-destructive">*</span></Label><Textarea value={form.remarks} error={!!errs.remarks} onChange={(e) => { setForm({ ...form, remarks: e.target.value }); setErrs({ ...errs, remarks: '' }); }} rows={3} placeholder="Summary of calibration result, any adjustments made…" />{errs.remarks && <p className="text-xs text-destructive">{errs.remarks}</p>}</div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between"><Label>Certificate File</Label><Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Upload</Button><input ref={fileRef} type="file" className="hidden" onChange={handleFile} /></div>
            {form.certFile ? (
              <div className="flex items-center gap-2 p-2 rounded border bg-muted/40 text-sm">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{form.certFile}</span>
                <button onClick={() => setForm({ ...form, certFile: '' })}><X className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            ) : <div className="p-3 border-2 border-dashed rounded text-xs text-muted-foreground text-center">No certificate uploaded</div>}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => submit('draft')} disabled={busy !== null}>{busy === 'draft' && <Loader2 className="h-4 w-4 animate-spin" />}<Save className="h-4 w-4" /> Save Draft</Button>
            <Button variant="accent" onClick={() => submit('submit')} disabled={busy !== null}>{busy === 'submit' && <Loader2 className="h-4 w-4 animate-spin" />}<Send className="h-4 w-4" /> Submit for QM Approval</Button>
          </div>
        </div>
      </Card>
    </PageWrapper>
  );
};
