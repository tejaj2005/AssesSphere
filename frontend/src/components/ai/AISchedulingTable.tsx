import { useEffect, useState } from 'react';
import { Loader2, Download, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAIScheduling } from '@/hooks/useAI';

export interface SchedulingEntity {
  id: string;
  name: string;
  type: string;
  lastInspectionDate: string;
  riskScore: number;
  overdueCAPAs: number;
}

interface Props {
  entities: SchedulingEntity[];
  availableInspectors?: number;
}

const HORIZONS = [30, 60, 90];

export const AISchedulingTable = ({ entities, availableInspectors = 3 }: Props) => {
  const { data, loading, execute } = useAIScheduling();
  const [horizon, setHorizon] = useState(30);

  useEffect(() => {
    if (entities.length) execute({ entities, availableInspectors, planningHorizonDays: horizon });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon, entities.length]);

  const rows: any[] = Array.isArray(data) ? data : [];

  const priorityVariant = (p: number) => (p <= 3 ? 'danger' : p <= 6 ? 'warning' : 'success');

  const exportCSV = () => {
    const header = ['Priority', 'Entity', 'Recommended Date', 'Frequency', 'Inspector Slot', 'Rationale'];
    const lines = rows.map((r) => [r.priority, r.entityName, r.recommendedDate, r.frequency, r.assignedInspectorSlot, `"${r.rationale}"`].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inspection_schedule.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-accent" /> Smart Inspection Schedule</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${horizon === h ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-secondary'}`}
              >
                {h}d
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows.length}><Download className="h-4 w-4" /> CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !rows.length ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Entity</th>
                  <th className="py-2 pr-3 font-medium">Recommended</th>
                  <th className="py-2 pr-3 font-medium">Frequency</th>
                  <th className="py-2 pr-3 font-medium">Slot</th>
                  <th className="py-2 font-medium">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.entityId} className="border-b border-border/60">
                    <td className="py-2 pr-3"><Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge></td>
                    <td className="py-2 pr-3 font-medium">{r.entityName}</td>
                    <td className="py-2 pr-3 tabular-nums">{r.recommendedDate}</td>
                    <td className="py-2 pr-3">{r.frequency}</td>
                    <td className="py-2 pr-3 tabular-nums">#{r.assignedInspectorSlot}</td>
                    <td className="py-2 text-xs text-muted-foreground">{r.rationale}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No entities to schedule.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
