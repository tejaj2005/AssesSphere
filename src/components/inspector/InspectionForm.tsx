import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Upload, X, FileText, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { InspectorReportType, ReportParameter, ReportChecklistItem, ChecklistObservation } from '@/types';

interface InspectionFormProps {
  type: InspectorReportType;
  /**
   * Either an existing backend InspectionReport (id !== 'new'; shape per
   * server/models/InspectionReport.ts — checklistResults/status/plan/observations/
   * evidenceFiles/rejectionReason, with `plan` populated as {_id, planId, title, planType})
   * or a fresh scaffold `{ id: 'new', plan: <full InspectionPlan incl. checklistTemplate> }`
   * built by InspectorReports.tsx from an active plan assigned to this inspector.
   * Left as `any` — the two shapes genuinely differ and this is a data-layer swap, not a
   * type-modeling exercise.
   */
  report?: any;
}

const calcVar = (target: number, actual: number) => target === 0 ? 0 : ((actual - target) / target) * 100;
const ragOf = (v: number): 'GREEN' | 'AMBER' | 'RED' => { const x = Math.abs(v); return x <= 2 ? 'GREEN' : x <= 5 ? 'AMBER' : 'RED'; };

export const InspectionForm = ({ type, report }: InspectionFormProps) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const isNew = !report || report.id === 'new';
  // MATERIAL/COMPONENT reports measure numeric parameters against a target; ASSEMBLY/
  // FINAL_PRODUCT reports run a PASS/FAIL/NOTE checklist. Both are ultimately backed by the
  // same backend array (InspectionPlan.checklistTemplate / InspectionReport.checklistResults) —
  // there's no separate "parameters" vs "checklist" concept server-side anymore.
  const useParams = type === 'MATERIAL' || type === 'COMPONENT';
  const sourceRows: any[] = isNew ? (report?.plan?.checklistTemplate || []) : (report?.checklistResults || []);

  const [parameters, setParameters] = useState<ReportParameter[]>(() => !useParams ? [] : sourceRows.map((row, idx): ReportParameter => isNew ? {
    id: `p-${idx}`, parameterName: row.parameter, unit: row.unit || '', targetValue: parseFloat(row.specificationValue) || 0,
    readings: [], actualValue: 0, variance: 0, status: 'GREEN', equipment: 'Equipment',
  } : {
    id: `p-${idx}`, parameterName: row.parameter, unit: '', targetValue: parseFloat(row.specificationValue) || 0,
    readings: [parseFloat(row.actualValue) || 0], actualValue: parseFloat(row.actualValue) || 0,
    variance: row.variancePercent ?? 0, status: row.result === 'PASS' ? 'GREEN' : row.result === 'MARGINAL' ? 'AMBER' : 'RED',
    equipment: 'Equipment', observation: row.observations,
  }));

  const [checklist, setChecklist] = useState<ReportChecklistItem[]>(() => useParams ? [] : sourceRows.map((row, idx): ReportChecklistItem => isNew ? {
    id: `c-${idx}`, item: row.parameter, result: 'PENDING',
  } : {
    id: `c-${idx}`, item: row.parameter,
    result: (row.result === 'PASS' ? 'PASS' : row.result === 'FAIL' ? 'FAIL' : row.observations ? 'NOTE' : 'PENDING') as ChecklistObservation,
    note: row.observations,
  }));

  const [observations, setObservations] = useState(isNew ? '' : (report?.observations || ''));
  const [evidence, setEvidence] = useState<string[]>(isNew ? [] : (report?.evidenceFiles || []).map((f: any) => f?.fileName || f));
  const [overallStatus, setOverallStatus] = useState<'APPROVED' | 'REJECTED' | 'HOLD'>(
    !isNew && report?.status === 'REJECTED' ? 'REJECTED' : !isNew && report?.status === 'ON_HOLD' ? 'HOLD' : 'APPROVED'
  );
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);
  // Tracks the Mongo _id once this report exists server-side, so a second "Save Draft"
  // click PUTs the same document instead of creating a duplicate.
  const [savedId, setSavedId] = useState<string | undefined>(isNew ? undefined : (report?._id || report?.id));

  // For Component reports, take a 3-reading average for accuracy; other types use a single reading.
  const allowMultiReading = type === 'COMPONENT';

  const updateReading = (paramId: string, idx: number, value: number) => {
    setParameters((p) => p.map((par) => {
      if (par.id !== paramId) return par;
      const readings = [...par.readings];
      readings[idx] = value;
      const actual = readings.reduce((a, b) => a + b, 0) / readings.length;
      const variance = calcVar(par.targetValue, actual);
      const status = ragOf(variance);
      return { ...par, readings, actualValue: actual, variance, status };
    }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((f) => setEvidence((p) => [...p, f.name]));
    toast.success(`${files.length} file(s) uploaded`);
    if (fileRef.current) fileRef.current.value = '';
  };

  const allChecklistDone = checklist.length === 0 || checklist.every((c) => c.result !== 'PENDING');
  const evidenceMissing = overallStatus === 'REJECTED' && evidence.length === 0;

  const save = async (action: 'DRAFT' | 'SUBMIT') => {
    if (action === 'SUBMIT' && !allChecklistDone) { toast.error('Complete all checklist items first'); return; }
    if (action === 'SUBMIT' && evidenceMissing) { toast.error('Evidence required for rejections'); return; }
    setBusy(action === 'DRAFT' ? 'draft' : 'submit');
    try {
      // Both parameters (numeric) and checklist (pass/fail/note) rows collapse into the
      // single backend checklistResults[] shape (see server/models/InspectionReport.ts).
      const checklistResults = [
        ...parameters.map((p) => ({
          parameter: p.parameterName,
          specificationValue: `${p.targetValue}${p.unit ? ` ${p.unit}` : ''}`,
          actualValue: `${p.actualValue}${p.unit ? ` ${p.unit}` : ''}`,
          result: (p.status === 'GREEN' ? 'PASS' : p.status === 'AMBER' ? 'MARGINAL' : 'FAIL') as 'PASS' | 'MARGINAL' | 'FAIL',
          variancePercent: p.variance,
        })),
        ...checklist.map((c) => ({
          parameter: c.item,
          specificationValue: 'Conformance',
          actualValue: c.result === 'NOTE' ? (c.note || '') : c.result,
          result: (c.result === 'PASS' ? 'PASS' : c.result === 'FAIL' ? 'FAIL' : 'NA') as 'PASS' | 'FAIL' | 'NA',
          observations: c.result === 'NOTE' ? c.note : undefined,
        })),
      ];

      const planId = report?.plan?._id || report?.plan?.id || report?.plan;

      const payload: Record<string, any> = {
        plan: planId,
        inspector: user?.id,
        inspectionDate: report?.inspectionDate || new Date().toISOString(),
        checklistResults,
        observations,
        evidenceFiles: evidence.map((name) => ({ fileName: name, fileUrl: '', fileType: '' })),
        organization: user?.organization,
      };
      // Explicit DRAFT status so re-saving a previously rejected/submitted report as a draft
      // (correcting it) moves it back out of that state; SUBMIT is handled by the dedicated
      // /submit endpoint below instead of setting status here.
      if (action === 'DRAFT') payload.status = 'DRAFT';
      // No dedicated inspector-side "overall status" field on the backend report — fold a
      // rejection call into the free-text nonConformities column for the reviewer's benefit.
      if (overallStatus === 'REJECTED') payload.nonConformities = observations;

      let saved: any;
      if (savedId) {
        saved = await api.put(`/inspection-reports/${savedId}`, payload);
      } else {
        saved = await api.post('/inspection-reports', payload);
        setSavedId(saved._id || saved.id);
      }
      if (action === 'SUBMIT') {
        const id = saved._id || saved.id || savedId;
        saved = await api.put(`/inspection-reports/${id}/submit`, {});
      }
      toast.success(action === 'DRAFT' ? 'Saved as draft' : 'Report submitted for review');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Parameters */}
      {parameters.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Inspection Parameters</h3>
          <div className="space-y-3">
            {parameters.map((p, i) => (
              <div key={p.id} className="p-3 rounded-lg border bg-muted/30">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                  <div>
                    <Label className="text-xs">Parameter</Label>
                    <p className="font-medium text-sm">{p.parameterName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.equipment}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Target</Label>
                    <p className="font-mono font-medium text-sm">{p.targetValue} {p.unit}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{allowMultiReading ? 'Readings (3)' : 'Actual'}</Label>
                    {allowMultiReading ? (
                      <div className="flex gap-1">
                        {[0, 1, 2].map((idx) => (
                          <Input key={idx} type="number" step="any" value={p.readings[idx] || ''} onChange={(e) => updateReading(p.id, idx, parseFloat(e.target.value) || 0)} className="w-20" placeholder={`R${idx + 1}`} />
                        ))}
                      </div>
                    ) : (
                      <Input type="number" step="any" value={p.readings[0] || ''} onChange={(e) => updateReading(p.id, 0, parseFloat(e.target.value) || 0)} className="w-28" />
                    )}
                  </div>
                  <div className="text-center">
                    <Label className="text-xs">Variance</Label>
                    <motion.div key={p.variance} initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="font-mono font-semibold text-sm">{p.variance.toFixed(2)}%</motion.div>
                    {p.status && <RAGBadge status={p.status} />}
                  </div>
                </div>
                {allowMultiReading && p.readings.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2">Average: <span className="font-mono">{p.actualValue.toFixed(2)} {p.unit}</span></p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
            Checklist Execution
            <Badge variant={allChecklistDone ? 'success' : 'warning'}>{checklist.filter((c) => c.result !== 'PENDING').length}/{checklist.length} complete</Badge>
          </h3>
          <ol className="space-y-2">
            {checklist.map((it, idx) => (
              <li key={it.id} className="p-3 rounded-lg border">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-xs font-mono text-muted-foreground mt-0.5">{idx + 1}.</span>
                  <p className="text-sm flex-1">{it.item}</p>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  {(['PASS', 'FAIL', 'NOTE'] as ChecklistObservation[]).map((r) => (
                    <button key={r} onClick={() => setChecklist((p) => p.map((x) => x.id === it.id ? { ...x, result: r } : x))}
                      className={cn('px-3 py-1 rounded-md border text-xs font-medium transition-colors',
                        it.result === r
                          ? r === 'PASS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : r === 'FAIL' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300'
                          : 'border-input hover:border-accent'
                      )}>
                      {r}
                    </button>
                  ))}
                  {it.result === 'NOTE' && (
                    <Input value={it.note || ''} onChange={(e) => setChecklist((p) => p.map((x) => x.id === it.id ? { ...x, note: e.target.value } : x))} placeholder="Note…" className="flex-1 max-w-md" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Observations + Status + Evidence */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Final Assessment</h3>
        <div className="space-y-4">
          <div>
            <Label>Overall Status</Label>
            <Select value={overallStatus} onChange={(v) => setOverallStatus(v as any)} options={[{ label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' }, { label: 'Hold', value: 'HOLD' }]} className="mt-1.5 max-w-xs" />
          </div>
          <div>
            <Label>Observations</Label>
            <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} placeholder="General notes about this inspection" className="mt-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Evidence Files{overallStatus === 'REJECTED' && <span className="text-destructive ml-1">*</span>}</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Upload</Button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />
            </div>
            <div className="border-2 border-dashed rounded-lg p-4 min-h-[80px]">
              {evidence.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Drag files or click Upload</p>
              ) : (
                <div className="space-y-1">
                  {evidence.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/40 text-sm">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate">{f}</span>
                      <button onClick={() => setEvidence((p) => p.filter((_, x) => x !== i))}><X className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  ))}
                </div>
              )}
              {evidenceMissing && <p className="text-xs text-destructive mt-2">Evidence required for rejection</p>}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-0 bg-background/95 backdrop-blur p-3 -mx-4 sm:-mx-8 border-t">
        <Button variant="outline" onClick={() => save('DRAFT')} disabled={busy !== null}>
          {busy === 'draft' && <Loader2 className="h-4 w-4 animate-spin" />}<Save className="h-4 w-4" /> Save Draft
        </Button>
        <Button variant="accent" onClick={() => save('SUBMIT')} disabled={busy !== null || !allChecklistDone || evidenceMissing}
          title={!allChecklistDone ? 'Complete all checklist items' : evidenceMissing ? 'Evidence required' : ''}>
          {busy === 'submit' && <Loader2 className="h-4 w-4 animate-spin" />}<Send className="h-4 w-4" /> Submit Report
        </Button>
      </div>
    </div>
  );
};
