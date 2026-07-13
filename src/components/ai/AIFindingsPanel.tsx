import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ChevronDown, RefreshCw, CheckCircle2, Lightbulb, AlertTriangle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIFindings, useAICapa } from '@/hooks/useAI';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  parameter: string;
  specificationValue: string;
  actualValue: string;
  result: 'PASS' | 'FAIL' | 'MARGINAL';
  observations?: string;
}

export interface FindingsInspectionData {
  inspectionReportId: string;
  productName: string;
  inspectionType: string;
  stage: string;
  checklistItems: ChecklistItem[];
  equipment?: string[];
  inspector?: string;
  inspectionDate?: string;
}

interface Props {
  inspectionData: FindingsInspectionData;
  onAccepted?: (findings: Record<string, any>) => void;
}

const severityVariant: Record<string, 'danger' | 'warning' | 'accent'> = {
  CRITICAL: 'danger',
  MAJOR: 'warning',
  MINOR: 'warning',
  OBSERVATION: 'accent',
};

const priorityVariant: Record<string, 'danger' | 'warning' | 'accent'> = {
  IMMEDIATE: 'danger',
  SHORT_TERM: 'warning',
  LONG_TERM: 'accent',
};

/** One non-conformity, with its own "Recommend CAPA" action — each card needs its own
 * loading/result state, so this has to be a component (one useAICapa() call per card),
 * not a .map() over a single shared hook instance in the parent. */
const NonConformityCard = ({ nc, productName, stage }: { nc: any; productName: string; stage: string }) => {
  const { data: capa, loading, error, execute } = useAICapa();

  const requestCapa = () => execute({
    findingId: nc.findingId,
    severity: nc.severity,
    description: nc.description,
    affectedParameter: nc.affectedParameter || 'Unspecified',
    productName,
    stage,
  });

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{nc.findingId}</span>
        <Badge variant={severityVariant[nc.severity] || 'slate'}>{nc.severity}</Badge>
        {nc.affectedParameter && <span className="text-xs text-muted-foreground">· {nc.affectedParameter}</span>}
      </div>
      <p className="text-sm">{nc.description}</p>
      {nc.standardReference && (
        <p className="mt-1 text-xs text-muted-foreground">Ref: {nc.standardReference}</p>
      )}
      {nc.immediateAction && (
        <p className="mt-1 text-xs"><span className="font-medium">Immediate action:</span> {nc.immediateAction}</p>
      )}

      {!capa ? (
        <div className="mt-2">
          <Button variant="outline" size="sm" onClick={requestCapa} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
            {loading ? 'Drafting CAPA…' : 'Recommend CAPA'}
          </Button>
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CAPA Recommendation</p>
            <AIGeneratedBadge />
          </div>
          {Array.isArray(capa.rootCauses) && capa.rootCauses.length > 0 && (
            <div>
              <p className="text-xs font-medium">Root Causes</p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {capa.rootCauses.map((rc: any, i: number) => <li key={i}>{rc.cause} ({rc.methodology}, {rc.likelihood} likelihood)</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(capa.correctiveActions) && capa.correctiveActions.length > 0 && (
            <div>
              <p className="text-xs font-medium">Corrective Actions</p>
              <ul className="space-y-1">
                {capa.correctiveActions.map((ca: any, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Badge variant={priorityVariant[ca.priority] || 'slate'} className="mt-0.5 shrink-0">{ca.priority}</Badge>
                    <span>{ca.action} — {ca.responsibleDepartment}, {ca.targetDays}d</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(capa.preventiveActions) && capa.preventiveActions.length > 0 && (
            <div>
              <p className="text-xs font-medium">Preventive Actions</p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {capa.preventiveActions.map((pa: any, i: number) => <li key={i}>{pa.action} — {pa.responsibleDepartment}, {pa.targetDays}d</li>)}
              </ul>
            </div>
          )}
          {typeof capa.estimatedRiskReduction === 'number' && (
            <p className="text-xs text-muted-foreground">Estimated risk reduction: <span className="font-medium tabular-nums">{capa.estimatedRiskReduction}%</span></p>
          )}
        </div>
      )}
    </div>
  );
};

export const AIFindingsPanel = ({ inspectionData, onAccepted }: Props) => {
  const { data, loading, error, execute } = useAIFindings();
  const [expanded, setExpanded] = useState(true);

  const run = () => execute(inspectionData);

  const ncs: any[] = data?.nonConformities || [];
  const ofis: any[] = data?.opportunitiesForImprovement || [];
  const confidence = data?.confidenceScore ?? 0;
  const confidencePct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);

  return (
    <Card className="border-accent/30">
      <CardContent className="p-4">
        {!data && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Let AI analyze the checklist and draft non-conformities, improvement opportunities, and an executive summary.
            </p>
            <Button variant="accent" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'AI is analyzing…' : 'Generate Findings with AI'}
            </Button>
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        )}

        {data && (
          <div>
            <button className="flex w-full items-center justify-between" onClick={() => setExpanded((e) => !e)}>
              <div className="flex items-center gap-2">
                <AIGeneratedBadge />
                <span className="text-sm font-medium">
                  {ncs.length} non-conformit{ncs.length === 1 ? 'y' : 'ies'} · {ofis.length} improvement{ofis.length === 1 ? '' : 's'}
                </span>
                <Badge variant={confidencePct >= 75 ? 'success' : confidencePct >= 50 ? 'warning' : 'danger'}>
                  {confidencePct}% confidence
                </Badge>
              </div>
              <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-4">
                    {data.executiveSummary && (
                      <div className="rounded-lg bg-secondary/60 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Executive Summary</p>
                        <p className="text-sm">{data.executiveSummary}</p>
                      </div>
                    )}

                    {ncs.length > 0 && (
                      <div className="space-y-2">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <AlertTriangle className="h-3.5 w-3.5" /> Non-Conformities
                        </p>
                        {ncs.map((nc, i) => (
                          <NonConformityCard key={i} nc={nc} productName={inspectionData.productName} stage={inspectionData.stage} />
                        ))}
                      </div>
                    )}

                    {ofis.length > 0 && (
                      <div className="space-y-2">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5" /> Opportunities for Improvement
                        </p>
                        {ofis.map((ofi, i) => (
                          <div key={i} className="rounded-lg border border-border p-3">
                            <p className="text-sm font-medium">{ofi.area}</p>
                            <p className="text-sm text-muted-foreground">{ofi.recommendation}</p>
                            {ofi.potentialBenefit && <p className="mt-1 text-xs text-muted-foreground">Benefit: {ofi.potentialBenefit}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {Array.isArray(data.positiveFindings) && data.positiveFindings.length > 0 && (
                      <div>
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Positive Findings
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                          {data.positiveFindings.map((p: string, i: number) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {onAccepted && (
                        <Button variant="accent" size="sm" onClick={() => onAccepted(data)}>
                          <CheckCircle2 className="h-4 w-4" /> Accept All Findings
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={run} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Re-analyze
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
