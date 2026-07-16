import { useEffect, useState } from 'react';
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIRiskScore } from '@/hooks/useAI';

export interface RiskHistoryData {
  totalInspections: number;
  failedInspections: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  capaOpenCount: number;
  capaOverdueCount: number;
  lastInspectionDate?: string;
  complianceScore?: number;
}

interface Props {
  entityType: 'SUPPLIER' | 'PRODUCT' | 'PROCESS' | 'DEPARTMENT' | 'SITE';
  entityId: string;
  entityName: string;
  historicalData: RiskHistoryData;
}

function scoreColor(score: number): string {
  if (score >= 75) return 'hsl(var(--danger))';
  if (score >= 50) return 'hsl(40 92% 51%)';
  if (score >= 25) return 'hsl(173 58% 39%)';
  return 'hsl(var(--success))';
}

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

const Gauge = ({ score }: { score: number }) => {
  const offset = CIRC - (score / 100) * CIRC;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
      <circle cx="65" cy="65" r={RADIUS} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
      <circle
        cx="65" cy="65" r={RADIUS} fill="none" stroke={scoreColor(score)} strokeWidth="10"
        strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
};

const trendIcon = (dir?: string) =>
  dir === 'WORSENING' ? <TrendingUp className="h-4 w-4 text-danger" />
  : dir === 'IMPROVING' ? <TrendingDown className="h-4 w-4 text-success" />
  : <Minus className="h-4 w-4 text-muted-foreground" />;

export const AIRiskScoreCard = ({ entityType, entityId, entityName, historicalData }: Props) => {
  const { data, loading, error, execute } = useAIRiskScore();
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  useEffect(() => {
    // This card instance is reused (not remounted) when the caller swaps which entity is
    // expanded, so local state from the previous entity — including a narrative fetch still
    // in flight — has to be reset explicitly here rather than relying on unmount.
    setNarrativeLoading(false);
    execute({ entityType, entityId, entityName, ...historicalData, withNarrative: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const loadNarrative = async () => {
    setNarrativeLoading(true);
    await execute({ entityType, entityId, entityName, ...historicalData, withNarrative: true });
    setNarrativeLoading(false);
  };

  const score = data?.overallScore ?? 0;
  const level = data?.riskLevel ?? '—';

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">{entityName}</p>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{entityType} Risk</span>
        </div>

        <div className="relative flex items-center justify-center">
          {loading && !data ? (
            <div className="flex h-[130px] items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <Gauge score={score} />
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor(score) }}>{score}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </>
          )}
        </div>

        <p className="mt-2 text-center text-sm font-semibold" style={{ color: scoreColor(score) }}>{level}</p>

        {!data?.riskNarrative ? (
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={loadNarrative} disabled={narrativeLoading}>
              {narrativeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Get AI Narrative
            </Button>
            {!narrativeLoading && error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="mt-4 space-y-3 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <AIGeneratedBadge />
              <span className="flex items-center gap-1 text-xs text-muted-foreground">{trendIcon(data.trendDirection)} {data.trendDirection}</span>
            </div>
            <p className="text-sm">{data.riskNarrative}</p>
            {Array.isArray(data.topRiskFactors) && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Risk Factors</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
                  {data.topRiskFactors.slice(0, 3).map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(data.mitigationPriorities) && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mitigation Priorities</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
                  {data.mitigationPriorities.slice(0, 2).map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
