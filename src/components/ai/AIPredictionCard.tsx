import { useState } from 'react';
import { Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIPrediction } from '@/hooks/useAI';

const ENTITY_TYPES = ['SUPPLIER', 'DEPARTMENT', 'PRODUCT_LINE', 'FACILITY', 'PROCESS'];

const likelihoodVariant: Record<string, 'danger' | 'warning' | 'success'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'success',
};

const confidenceVariant: Record<string, 'success' | 'warning' | 'slate'> = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'slate',
};

interface TrendRow {
  period: string;
  score: number;
  findings: number;
}

const DEFAULT_TREND: TrendRow[] = [
  { period: 'Q1 2026', score: 38, findings: 3 },
  { period: 'Q2 2026', score: 45, findings: 4 },
  { period: 'Q3 2026', score: 52, findings: 6 },
];

export const AIPredictionCard = () => {
  const { data, loading, error, execute } = useAIPrediction();
  const [entityName, setEntityName] = useState('Acme Components Ltd.');
  const [entityType, setEntityType] = useState('SUPPLIER');
  const [currentRiskScore, setCurrentRiskScore] = useState(52);
  const [historicalTrend, setHistoricalTrend] = useState<TrendRow[]>(DEFAULT_TREND);

  const updateRow = (i: number, field: keyof TrendRow, value: string) => {
    setHistoricalTrend((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, [field]: field === 'period' ? value : Number(value) } : r)),
    );
  };

  const predict = () =>
    execute({
      entityId: entityName.trim().toLowerCase().replace(/\s+/g, '-') || 'entity-1',
      entityType,
      entityName,
      currentRiskScore: Number(currentRiskScore),
      historicalTrend,
    });

  const inputCls = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25';
  const cellCls = 'h-9 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/25';

  const lists: Array<{ label: string; items: string[] }> = [
    { label: 'High Risk Areas', items: data?.highRiskAreas || [] },
    { label: 'Repeat Nonconformity Risk', items: data?.repeatNonconformityRisk || [] },
    { label: 'Early Warnings', items: data?.earlyWarnings || [] },
    { label: 'Recommended Preventive Actions', items: data?.recommendedPreventiveActions || [] },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" /> Predictive Compliance Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Entity Name</span>
            <input className={inputCls} value={entityName} onChange={(e) => setEntityName(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Entity Type</span>
            <select className={inputCls} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Current Risk Score</span>
            <input type="number" className={inputCls} value={currentRiskScore} onChange={(e) => setCurrentRiskScore(Number(e.target.value))} />
          </label>
        </div>

        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Historical Trend</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-2 font-medium">Period</th>
                  <th className="p-2 font-medium">Score</th>
                  <th className="p-2 font-medium">Findings</th>
                </tr>
              </thead>
              <tbody>
                {historicalTrend.map((row, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="p-2"><input className={cellCls} value={row.period} onChange={(e) => updateRow(i, 'period', e.target.value)} /></td>
                    <td className="p-2"><input type="number" className={cellCls} value={row.score} onChange={(e) => updateRow(i, 'score', e.target.value)} /></td>
                    <td className="p-2"><input type="number" className={cellCls} value={row.findings} onChange={(e) => updateRow(i, 'findings', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Button variant="accent" onClick={predict} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'AI is predicting risk…' : 'Predict Compliance'}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}

        {data && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AIGeneratedBadge />
              <Badge variant={confidenceVariant[data.confidenceLevel] || 'slate'}>{data.confidenceLevel} confidence</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={likelihoodVariant[data.auditFindingLikelihood] || 'slate'}>
                Audit Finding Likelihood: {data.auditFindingLikelihood}
              </Badge>
              <Badge variant={likelihoodVariant[data.capaFailureProbability] || 'slate'}>
                CAPA Failure Probability: {data.capaFailureProbability}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Predicted Risk (30 days)</p>
                <p className="text-2xl font-bold tabular-nums">{data.predictedRiskScore30Days}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Predicted Risk (90 days)</p>
                <p className="text-2xl font-bold tabular-nums">{data.predictedRiskScore90Days}</p>
              </div>
            </div>

            {lists.map((l) =>
              l.items.length > 0 ? (
                <div key={l.label}>
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{l.label}</p>
                  <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    {l.items.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
