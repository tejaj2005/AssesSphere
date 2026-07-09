import { useState } from 'react';
import { Info, Sparkles, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIQualityScore } from '@/hooks/useAI';

export interface QualityAssessmentData {
  assessmentId: string;
  totalQuestions: number;
  answeredQuestions: number;
  evidenceCount: number;
  findingsCount: number;
  capaCount: number;
  checklistCompletionRate: number;
  durationHours?: number;
}

// Mirrors the server formula so the badge renders instantly without a round-trip.
function localScore(d: QualityAssessmentData) {
  const completeness = Math.round((d.answeredQuestions / Math.max(d.totalQuestions, 1)) * 100);
  const evidenceScore = Math.round(Math.min(Math.min(d.evidenceCount / Math.max(d.findingsCount, 1), 2) * 50, 100));
  const capaScore = Math.round(Math.min(d.capaCount / Math.max(d.findingsCount, 1), 1) * 100);
  const overall = Math.round(completeness * 0.4 + evidenceScore * 0.35 + capaScore * 0.25);
  let maturityLevel = 'INITIAL';
  if (overall >= 85) maturityLevel = 'OPTIMIZING';
  else if (overall >= 70) maturityLevel = 'QUANTITATIVELY_MANAGED';
  else if (overall >= 55) maturityLevel = 'DEFINED';
  else if (overall >= 40) maturityLevel = 'MANAGED';
  return { overall, completeness, evidenceScore, capaScore, maturityLevel };
}

const maturityVariant: Record<string, 'danger' | 'warning' | 'accent' | 'teal' | 'success'> = {
  INITIAL: 'danger',
  MANAGED: 'warning',
  DEFINED: 'accent',
  QUANTITATIVELY_MANAGED: 'teal',
  OPTIMIZING: 'success',
};

export const AIQualityScoreBadge = ({ assessmentData }: { assessmentData: QualityAssessmentData }) => {
  const local = localScore(assessmentData);
  const { data, loading, execute } = useAIQualityScore();
  const [open, setOpen] = useState(false);

  const insight = () => { setOpen(true); execute({ ...assessmentData, withNarrative: true }); };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <Badge variant={maturityVariant[local.maturityLevel] || 'slate'}>
        {local.maturityLevel.replace(/_/g, ' ')} · {local.overall}%
      </Badge>

      <div className="group relative">
        <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
        <div className="pointer-events-none absolute left-1/2 z-30 mt-1 hidden w-52 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 text-xs shadow-lg group-hover:block">
          <p className="flex justify-between"><span className="text-muted-foreground">Completeness</span><span className="tabular-nums">{local.completeness}%</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Evidence quality</span><span className="tabular-nums">{local.evidenceScore}%</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">CAPA adequacy</span><span className="tabular-nums">{local.capaScore}%</span></p>
        </div>
      </div>

      <button onClick={insight} className="text-accent hover:opacity-80" title="Get AI insight" aria-label="Get AI insight">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      </button>

      {open && data && (
        <div className="absolute right-0 top-6 z-40 w-72 rounded-lg border border-border bg-popover p-3 text-xs shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <AIGeneratedBadge />
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          {Array.isArray(data.strengths) && (
            <>
              <p className="font-semibold text-success">Strengths</p>
              <ul className="mb-2 list-inside list-disc space-y-0.5">{data.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          {Array.isArray(data.areasForImprovement) && (
            <>
              <p className="font-semibold text-warning">Areas for Improvement</p>
              <ul className="list-inside list-disc space-y-0.5">{data.areasForImprovement.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};
