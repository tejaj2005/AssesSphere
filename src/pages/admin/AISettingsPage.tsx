import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AI_BASE } from '@/hooks/useAI';

const FEATURES = [
  'findings', 'capa', 'gap-analysis', 'evidence-validation', 'document-intel',
  'copilot', 'risk-score', 'quality-score', 'scheduling', 'report',
  'maturity', 'prediction', 'benchmarking', 'executive-summary', 'assessment-assist',
];
const FEATURE_LABELS: Record<string, string> = {
  'findings': 'AI Findings Generator',
  'capa': 'CAPA Recommendation Engine',
  'gap-analysis': 'AI Gap Analysis',
  'evidence-validation': 'Smart Evidence Validation',
  'document-intel': 'AI Document Intelligence',
  'copilot': 'AI Compliance Copilot',
  'risk-score': 'Intelligent Risk Scoring',
  'quality-score': 'Assessment Quality Scoring',
  'scheduling': 'Smart Assessment Scheduling',
  'report': 'Generative Reports',
  'maturity': 'Predictive Maturity Model',
  'prediction': 'Predictive Compliance Intelligence',
  'benchmarking': 'Benchmarking Intelligence',
  'executive-summary': 'Executive AI Dashboard',
  'assessment-assist': 'AI Assessment Assistant',
};
const TOGGLE_KEY = 'pqas_ai_feature_toggles';

const StatusCard = ({ label, ok }: { label: string; ok: boolean | null }) => (
  <Card>
    <CardContent className="flex items-center justify-between p-4">
      <span className="text-sm font-medium">{label}</span>
      {ok === null ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        : ok ? <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 className="h-5 w-5" /> Configured</span>
        : <span className="flex items-center gap-1 text-sm text-danger"><XCircle className="h-5 w-5" /> Unavailable</span>}
    </CardContent>
  </Card>
);

export const AISettingsPage = () => {
  const [health, setHealth] = useState<any>(null);
  const [healthErr, setHealthErr] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(TOGGLE_KEY) || '{}'); } catch { return {}; }
  });

  const refresh = async () => {
    setHealthErr(false);
    try {
      const [h, l] = await Promise.all([
        fetch(`${AI_BASE}/health`).then((r) => r.json()),
        fetch(`${AI_BASE}/audit-log`).then((r) => r.json()),
      ]);
      setHealth(h);
      setLogs(l.data || []);
    } catch {
      setHealthErr(true);
    }
  };
  useEffect(() => { refresh(); }, []);

  const toggle = (f: string) => {
    const next = { ...toggles, [f]: toggles[f] === false ? true : false };
    setToggles(next);
    localStorage.setItem(TOGGLE_KEY, JSON.stringify(next));
  };
  const isOn = (f: string) => toggles[f] !== false;

  // Per-feature usage stats
  const stats = FEATURES.map((f) => {
    const entries = logs.filter((l) => l.feature === f);
    const ok = entries.filter((e) => e.success).length;
    const avg = entries.length ? Math.round(entries.reduce((s, e) => s + (e.durationMs || 0), 0) / entries.length) : 0;
    return { feature: f, calls: entries.length, successRate: entries.length ? Math.round((ok / entries.length) * 100) : null, avgMs: avg };
  });

  return (
    <PageWrapper>
      <PageHeader
        title="AI Settings"
        description="Provider status, feature toggles and usage for the AssessSphere AI layer."
        action={<Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" /> Refresh</Button>}
      />

      {healthErr && (
        <Card className="mb-4 border-danger/40">
          <CardContent className="p-4 text-sm text-danger">
            Could not reach the AI backend at <code>{AI_BASE}</code>. Make sure the server is running (<code>npm run server:dev</code>).
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatusCard label="Gemini" ok={health ? health.gemini === 'configured' : null} />
        <StatusCard label="Groq" ok={health ? health.groq === 'configured' : null} />
        <StatusCard label="MongoDB" ok={health ? health.status === 'ok' : null} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Feature Toggles</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <label key={f} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm">{FEATURE_LABELS[f]}</span>
              <button
                onClick={() => toggle(f)}
                role="switch" aria-checked={isOn(f)}
                className={`relative h-5 w-9 rounded-full transition-colors ${isOn(f) ? 'bg-accent' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${isOn(f) ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Usage by Feature</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Feature</th>
                  <th className="py-2 pr-3 font-medium">Calls</th>
                  <th className="py-2 pr-3 font-medium">Success</th>
                  <th className="py-2 font-medium">Avg ms</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.feature} className="border-b border-border/60">
                    <td className="py-1.5 pr-3">{FEATURE_LABELS[s.feature]}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{s.calls}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{s.successRate === null ? '—' : `${s.successRate}%`}</td>
                    <td className="py-1.5 tabular-nums">{s.avgMs || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent AI Calls</CardTitle></CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No AI calls recorded yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {logs.slice(0, 20).map((l, i) => (
                  <li key={i} className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <div className="min-w-0">
                      <span className="font-medium">{FEATURE_LABELS[l.feature] || l.feature}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <Badge variant={l.success ? 'success' : 'danger'}>{l.provider}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};
