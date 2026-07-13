import { useRef, useState } from 'react';
import { Sparkles, Loader2, BarChart3, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIBenchmark } from '@/hooks/useAI';

interface BenchmarkEntity {
  id: string;
  name: string;
  type: string;
  complianceScore: number;
  totalInspections: number;
  failureRate: number;
  capaClosureRate: number;
  avgFindingsPerInspection: number;
}

const DEFAULT_ENTITIES: BenchmarkEntity[] = [
  { id: 'ent-1', name: 'Acme Components Ltd.', type: 'SUPPLIER', complianceScore: 91, totalInspections: 42, failureRate: 0.05, capaClosureRate: 88, avgFindingsPerInspection: 1.2 },
  { id: 'ent-2', name: 'Northbridge Fasteners', type: 'SUPPLIER', complianceScore: 76, totalInspections: 30, failureRate: 0.18, capaClosureRate: 65, avgFindingsPerInspection: 2.4 },
  { id: 'ent-3', name: 'Vertex Polymers Inc.', type: 'SUPPLIER', complianceScore: 63, totalInspections: 24, failureRate: 0.29, capaClosureRate: 52, avgFindingsPerInspection: 3.6 },
];

const categoryVariant: Record<string, 'success' | 'accent' | 'warning' | 'danger'> = {
  TOP_PERFORMER: 'success',
  GOOD: 'accent',
  AVERAGE: 'warning',
  NEEDS_IMPROVEMENT: 'danger',
};

export const AIBenchmarkPanel = () => {
  const { data, loading, error, execute } = useAIBenchmark();
  const [entities, setEntities] = useState<BenchmarkEntity[]>(DEFAULT_ENTITIES);
  const nextId = useRef(DEFAULT_ENTITIES.length + 1);

  const updateEntity = (id: string, field: keyof BenchmarkEntity, value: string) => {
    setEntities((rows) =>
      rows.map((r) =>
        r.id === id
          ? { ...r, [field]: field === 'name' || field === 'type' ? value : Number(value) }
          : r,
      ),
    );
  };

  const addEntity = () => {
    setEntities((rows) => [
      ...rows,
      {
        id: `ent-${nextId.current++}`,
        name: '',
        type: 'SUPPLIER',
        complianceScore: 0,
        totalInspections: 0,
        failureRate: 0,
        capaClosureRate: 0,
        avgFindingsPerInspection: 0,
      },
    ]);
  };

  const removeEntity = (id: string) => setEntities((rows) => rows.filter((r) => r.id !== id));

  const runBenchmark = () =>
    execute({
      entityType: 'SUPPLIER',
      entities: entities.map((e) => ({
        ...e,
        complianceScore: Number(e.complianceScore),
        totalInspections: Number(e.totalInspections),
        failureRate: Number(e.failureRate),
        capaClosureRate: Number(e.capaClosureRate),
        avgFindingsPerInspection: Number(e.avgFindingsPerInspection),
      })),
    });

  const cellCls = 'h-9 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/25';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" /> Benchmarking Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Entities (SUPPLIER)</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-2 font-medium">Name</th>
                  <th className="p-2 font-medium">Compliance Score</th>
                  <th className="p-2 font-medium">Total Inspections</th>
                  <th className="p-2 font-medium">Failure Rate (0-1)</th>
                  <th className="p-2 font-medium">CAPA Closure Rate</th>
                  <th className="p-2 font-medium">Avg Findings/Inspection</th>
                  <th className="p-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {entities.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="p-2 min-w-[160px]">
                      <input className={cellCls} value={row.name} onChange={(e) => updateEntity(row.id, 'name', e.target.value)} placeholder="Entity name" />
                    </td>
                    <td className="p-2">
                      <input type="number" className={cellCls} value={row.complianceScore} onChange={(e) => updateEntity(row.id, 'complianceScore', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <input type="number" className={cellCls} value={row.totalInspections} onChange={(e) => updateEntity(row.id, 'totalInspections', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <input type="number" step="0.01" min="0" max="1" className={cellCls} value={row.failureRate} onChange={(e) => updateEntity(row.id, 'failureRate', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <input type="number" className={cellCls} value={row.capaClosureRate} onChange={(e) => updateEntity(row.id, 'capaClosureRate', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <input type="number" step="0.1" className={cellCls} value={row.avgFindingsPerInspection} onChange={(e) => updateEntity(row.id, 'avgFindingsPerInspection', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <Button variant="outline" size="icon-sm" onClick={() => removeEntity(row.id)} disabled={entities.length <= 1}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={addEntity}>
            <Plus className="h-4 w-4" /> Add Entity
          </Button>
        </div>

        <Button variant="accent" onClick={runBenchmark} disabled={loading || entities.length === 0}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'AI is benchmarking…' : 'Run Benchmark'}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}

        {data && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AIGeneratedBadge />
              <div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Portfolio Health Score </span>
                <span className="text-lg font-bold tabular-nums">{data.portfolioHealthScore}</span>
              </div>
            </div>

            <p className="text-sm">{data.summary}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {data.keyInsights?.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Key Insights</p>
                  <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    {data.keyInsights.map((k: string, i: number) => <li key={i}>{k}</li>)}
                  </ul>
                </div>
              )}
              {data.actionableRecommendations?.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Actionable Recommendations</p>
                  <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    {data.actionableRecommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {data.performanceGapAnalysis && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Performance Gap Analysis</p>
                <p className="text-sm text-muted-foreground">{data.performanceGapAnalysis}</p>
              </div>
            )}

            {Array.isArray(data.rankings) && data.rankings.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Rankings</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="p-2 font-medium">Rank</th>
                        <th className="p-2 font-medium">Name</th>
                        <th className="p-2 font-medium">Compliance Score</th>
                        <th className="p-2 font-medium">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.rankings].sort((a: any, b: any) => a.rank - b.rank).map((r: any, i: number) => (
                        <tr key={i} className="border-b border-border/60 last:border-0">
                          <td className="p-2 tabular-nums">{r.rank}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2 tabular-nums">{r.complianceScore}</td>
                          <td className="p-2"><Badge variant={categoryVariant[r.performanceCategory] || 'slate'}>{r.performanceCategory}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
