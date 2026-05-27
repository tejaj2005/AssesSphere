import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { InspectionReport, InspectorReportType, ReportParameter, ReportChecklistItem, ChecklistObservation } from '@/types';

interface InspectionFormProps {
  type: InspectorReportType;
  report?: InspectionReport;
  taskId?: string;
}

const calcVar = (target: number, actual: number) => target === 0 ? 0 : ((actual - target) / target) * 100;
const ragOf = (v: number): 'GREEN' | 'AMBER' | 'RED' => { const x = Math.abs(v); return x <= 2 ? 'GREEN' : x <= 5 ? 'AMBER' : 'RED'; };

export const InspectionForm = ({ type, report, taskId }: InspectionFormProps) => {
  const { inspectionPlans, materialPlans, addInspectionReport, updateInspectionReport, updateInspectorTask } = useData();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parameters, setParameters] = useState<ReportParameter[]>(report?.parameters || []);
  const [checklist, setChecklist] = useState<ReportChecklistItem[]>(report?.checklistItems || []);
  const [observations, setObservations] = useState(report?.observations || '');
  const [evidence, setEvidence] = useState<string[]>(report?.evidenceFiles || []);
  const [overallStatus, setOverallStatus] = useState<'APPROVED' | 'REJECTED' | 'HOLD'>(report?.overallStatus || 'APPROVED');
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);

  // For Material report type, use multi-reading? No, just single. For Component, use multi-reading (3 readings).
  const allowMultiReading = type === 'COMPONENT';

  // Recompute variance live for each parameter
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
    await new Promise((r) => setTimeout(r, 350));

    const reportData: Omit<InspectionReport, 'id'> = {
      reportCode: report?.reportCode || `IR-${type.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
      type, planId: report?.planId, planCode: report?.planCode,
      productId: report?.productId, productName: report?.productName,
      materialName: report?.materialName, supplierName: report?.supplierName,
      componentName: report?.componentName, stageName: report?.stageName, assemblerResource: report?.assemblerResource,
      parameters, checklistItems: checklist, observations, evidenceFiles: evidence, overallStatus,
      inspectorId: user?.id || '', inspectorName: user?.name || 'Inspector',
      inspectionDate: report?.inspectionDate || new Date().toISOString(),
      submittedDate: action === 'SUBMIT' ? new Date().toISOString() : report?.submittedDate,
      reportStatus: action === 'SUBMIT' ? 'SUBMITTED' : 'IN_PROGRESS',
    };

    if (report) updateInspectionReport(report.id, reportData);
    else addInspectionReport(reportData);
    if (taskId) updateInspectorTask(taskId, { status: action === 'SUBMIT' ? 'SUBMITTED' : 'ASSIGNED' });
    setBusy(null);
    toast.success(action === 'DRAFT' ? 'Saved as draft' : `Report submitted for ${type === 'CALIBRATION' ? 'Quality Manager' : 'review'}`);
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
