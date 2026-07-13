import { useState } from 'react';
import { Sparkles, Loader2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIMaturity } from '@/hooks/useAI';

const AUDIT_FREQUENCIES = ['Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];

const levelVariant: Record<string, 'danger' | 'warning' | 'accent' | 'teal' | 'success'> = {
  INITIAL: 'danger',
  MANAGED: 'warning',
  DEFINED: 'accent',
  QUANTITATIVELY_MANAGED: 'teal',
  OPTIMIZING: 'success',
};

const effortVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

export const AIMaturityCard = () => {
  const { data, loading, error, execute } = useAIMaturity();
  const [organizationId, setOrganizationId] = useState('default-org');
  const [totalInspections, setTotalInspections] = useState(180);
  const [averageComplianceScore, setAverageComplianceScore] = useState(85);
  const [capaClosureRate, setCapaClosureRate] = useState(80);
  const [documentedProcesses, setDocumentedProcesses] = useState(20);
  const [auditFrequency, setAuditFrequency] = useState('Quarterly');

  const assess = () =>
    execute({
      organizationId,
      totalInspections: Number(totalInspections),
      averageComplianceScore: Number(averageComplianceScore),
      capaClosureRate: Number(capaClosureRate),
      documentedProcesses: Number(documentedProcesses),
      auditFrequency,
    });

  const inputCls = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" /> Predictive Maturity Model
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Organization ID</span>
            <input className={inputCls} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Audit Frequency</span>
            <select className={inputCls} value={auditFrequency} onChange={(e) => setAuditFrequency(e.target.value)}>
              {AUDIT_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Total Inspections</span>
            <input type="number" className={inputCls} value={totalInspections} onChange={(e) => setTotalInspections(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Avg. Compliance Score</span>
            <input type="number" className={inputCls} value={averageComplianceScore} onChange={(e) => setAverageComplianceScore(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">CAPA Closure Rate</span>
            <input type="number" className={inputCls} value={capaClosureRate} onChange={(e) => setCapaClosureRate(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Documented Processes</span>
            <input type="number" className={inputCls} value={documentedProcesses} onChange={(e) => setDocumentedProcesses(Number(e.target.value))} />
          </label>
        </div>

        <Button variant="accent" onClick={assess} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'AI is assessing maturity…' : 'Assess Maturity'}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}

        {data && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AIGeneratedBadge />
              <span className="text-xs text-muted-foreground">
                Next: {data.nextLevelName} · Est. {data.estimatedTimeToNextLevel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={levelVariant[data.currentLevel] || 'slate'} className="px-3 py-1 text-sm">
                {data.currentLevel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Level score: <span className="font-semibold tabular-nums">{data.levelScore}</span>
              </span>
            </div>

            <p className="text-sm">{data.description}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Strength Areas</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                  {(data.strengthAreas || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Gap Areas</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                  {(data.gapAreas || []).map((g: string, i: number) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            </div>

            {Array.isArray(data.roadmapToNextLevel) && data.roadmapToNextLevel.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Roadmap to Next Level</p>
                <ol className="space-y-2">
                  {data.roadmapToNextLevel.map((r: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">{i + 1}</span>
                      <span className="flex-1">
                        {r.action}
                        <span className="ml-1 text-xs text-muted-foreground">(~{r.timelineMonths}mo)</span>
                      </span>
                      <Badge variant={effortVariant[r.effort] || 'slate'}>{r.effort}</Badge>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
