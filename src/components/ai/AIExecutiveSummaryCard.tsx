import { useState } from 'react';
import { Sparkles, Loader2, LayoutDashboard, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIExecutiveSummary } from '@/hooks/useAI';

const healthVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  EXCELLENT: 'success',
  GOOD: 'success',
  ATTENTION_NEEDED: 'warning',
  CRITICAL: 'danger',
};

const trendIcon = (dir?: string) => {
  if (dir === 'IMPROVING') return <TrendingUp className="h-4 w-4 text-success" />;
  if (dir === 'DECLINING') return <TrendingDown className="h-4 w-4 text-danger" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export const AIExecutiveSummaryCard = () => {
  const { data, loading, error, execute } = useAIExecutiveSummary();
  const [organizationId, setOrganizationId] = useState('default-org');
  const [period, setPeriod] = useState('This Quarter');
  const [totalInspections, setTotalInspections] = useState(240);
  const [approvalRate, setApprovalRate] = useState(92);
  const [openFindings, setOpenFindings] = useState(18);
  const [criticalFindings, setCriticalFindings] = useState(3);
  const [supplierCount, setSupplierCount] = useState(12);
  const [avgRiskScore, setAvgRiskScore] = useState(35);

  const generate = () =>
    execute({
      organizationId,
      period,
      totalInspections: Number(totalInspections),
      approvalRate: Number(approvalRate),
      openFindings: Number(openFindings),
      criticalFindings: Number(criticalFindings),
      supplierCount: Number(supplierCount),
      avgRiskScore: Number(avgRiskScore),
    });

  const inputCls = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-accent" /> Executive AI Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Organization ID</span>
            <input className={inputCls} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Period</span>
            <input className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Total Inspections</span>
            <input type="number" className={inputCls} value={totalInspections} onChange={(e) => setTotalInspections(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Approval Rate (%)</span>
            <input type="number" className={inputCls} value={approvalRate} onChange={(e) => setApprovalRate(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Open Findings</span>
            <input type="number" className={inputCls} value={openFindings} onChange={(e) => setOpenFindings(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Critical Findings</span>
            <input type="number" className={inputCls} value={criticalFindings} onChange={(e) => setCriticalFindings(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Supplier Count</span>
            <input type="number" className={inputCls} value={supplierCount} onChange={(e) => setSupplierCount(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Avg. Risk Score</span>
            <input type="number" className={inputCls} value={avgRiskScore} onChange={(e) => setAvgRiskScore(Number(e.target.value))} />
          </label>
        </div>

        <Button variant="accent" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'AI is preparing your summary…' : 'Generate Executive Summary'}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}

        {data && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AIGeneratedBadge />
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {trendIcon(data.trendDirection)} {data.trendDirection}
              </span>
            </div>

            <h3 className="text-lg font-semibold">{data.headline}</h3>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={healthVariant[data.overallHealthStatus] || 'slate'} className="px-3 py-1 text-sm">
                {data.overallHealthStatus}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Quality Maturity Index: <span className="font-semibold tabular-nums">{data.qualityMaturityIndex}</span>
              </span>
            </div>

            <p className="text-sm">{data.executiveSummary}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {data.topConcerns?.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Top Concerns</p>
                  <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    {data.topConcerns.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              {data.positiveHighlights?.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Positive Highlights</p>
                  <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    {data.positiveHighlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {data.immediateActions?.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Immediate Actions</p>
                <ol className="list-inside list-decimal space-y-0.5 text-sm text-muted-foreground">
                  {data.immediateActions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
