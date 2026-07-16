import { useEffect, useState, useRef } from 'react';
import { UploadCloud, Loader2, Download, FileText, RefreshCw } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIGapAnalysis, AI_BASE, authHeaders } from '@/hooks/useAI';

const STANDARDS = [
  { value: 'ISO_9001_2015', label: 'ISO 9001:2015' },
  { value: 'GMP', label: 'GMP' },
  { value: 'GLP', label: 'GLP' },
  { value: 'GDP', label: 'GDP' },
  { value: 'GCP', label: 'GCP' },
  { value: 'HIPAA', label: 'HIPAA' },
  { value: 'FDA_21_CFR_PART_11', label: 'FDA 21 CFR Part 11' },
];

const impactVariant: Record<string, 'danger' | 'warning' | 'accent'> = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'accent' };

const Donut = ({ score }: { score: number }) => {
  const color = score >= 80 ? 'hsl(var(--success))' : score >= 60 ? 'hsl(40 92% 51%)' : 'hsl(var(--danger))';
  const r = 46, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .8s ease' }} />
    </svg>
  );
};

export const AIGapAnalysisPage = () => {
  const { data, loading, error, execute } = useAIGapAnalysis();
  const [file, setFile] = useState<File | null>(null);
  const [standard, setStandard] = useState('ISO_9001_2015');
  const [history, setHistory] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${AI_BASE}/audit-log?feature=gap-analysis`, { headers: authHeaders() });
      const json = await res.json();
      setHistory((json.data || []).slice(0, 5));
    } catch { /* ignore */ }
  };
  useEffect(() => { loadHistory(); }, []);

  const analyze = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('document', file);
    fd.append('standard', standard);
    const result = await execute({}, fd);
    if (result) loadHistory();
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gap_analysis.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const standardLabel = STANDARDS.find((s) => s.value === standard)?.label || standard;
  const score = data?.overallComplianceScore ?? 0;
  const inputCls = 'h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25';

  return (
    <PageWrapper>
      <PageHeader title="AI Gap Analysis" description="Upload a QMS document and analyze it against a compliance standard." />

      <Card className="mb-4">
        <CardContent className="p-5">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-center transition-colors hover:border-accent/60"
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">{file ? file.name : 'Drop a PDF, DOCX or TXT here, or click to browse'}</p>
            <p className="text-xs text-muted-foreground">Max 10 MB</p>
            <input ref={inputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select className={inputCls} value={standard} onChange={(e) => setStandard(e.target.value)}>
              {STANDARDS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <Button variant="accent" onClick={analyze} disabled={!file || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {loading ? `Analyzing against ${standardLabel}…` : 'Upload & Analyze'}
            </Button>
            {error && (
              <span className="flex items-center gap-2 text-xs text-danger">
                {error} <button onClick={analyze} className="inline-flex items-center gap-1 underline"><RefreshCw className="h-3 w-3" /> Retry</button>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center p-5">
              <div className="mb-2 self-start"><AIGeneratedBadge /></div>
              <div className="relative flex items-center justify-center">
                <Donut score={score} />
                <span className="absolute text-2xl font-bold tabular-nums">{score}%</span>
              </div>
              <p className="mt-2 text-sm font-medium">Compliance vs. {standardLabel}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={downloadJSON}><Download className="h-4 w-4" /> Download JSON</Button>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            {Array.isArray(data.missingControls) && data.missingControls.length > 0 && (
              <Card><CardHeader><CardTitle>Missing Controls</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.missingControls.map((m: any, i: number) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{m.controlId}</span>
                        <Badge variant={impactVariant[m.riskImpact] || 'slate'}>{m.riskImpact}</Badge>
                      </div>
                      <p className="text-sm font-medium">{m.requirement}</p>
                      <p className="text-sm text-muted-foreground">{m.gap}</p>
                      {m.recommendation && <p className="mt-1 text-xs"><span className="font-medium">Fix:</span> {m.recommendation}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {Array.isArray(data.prioritizedActionPlan) && data.prioritizedActionPlan.length > 0 && (
              <Card><CardHeader><CardTitle>Prioritized Action Plan</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {[...data.prioritizedActionPlan].sort((a, b) => (a.priority || 99) - (b.priority || 99)).map((a: any, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">{i + 1}</span>
                        <span><span className="font-medium">{a.action}</span>
                          <span className="ml-1 text-xs text-muted-foreground">({a.effort} effort · ~{a.timelineWeeks}w)</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {Array.isArray(data.strengths) && data.strengths.length > 0 && (
              <Card><CardHeader><CardTitle>Strengths</CardTitle></CardHeader>
                <CardContent>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {data.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle>Recent Analyses</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between border-b border-border/60 py-1.5">
                  <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                  <Badge variant={h.success ? 'success' : 'danger'}>{h.success ? 'OK' : 'Failed'}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
};
