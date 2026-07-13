import { useState } from 'react';
import { ClipboardList, Loader2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIChecklist } from '@/hooks/useAI';
import { cn } from '@/lib/utils';

const STANDARDS = [
  { value: 'ISO_9001_2015', label: 'ISO 9001:2015' },
  { value: 'GMP', label: 'Good Manufacturing Practice' },
  { value: 'GLP', label: 'Good Laboratory Practice' },
  { value: 'GDP', label: 'Good Distribution Practice' },
  { value: 'GCP', label: 'Good Clinical Practice' },
  { value: 'HIPAA', label: 'HIPAA' },
  { value: 'FDA_21_CFR_PART_11', label: 'FDA 21 CFR Part 11' },
];

const riskVariant: Record<string, 'danger' | 'warning' | 'success'> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'success',
};

interface ChecklistQuestion {
  id: string;
  question: string;
  evidenceRequired: string;
  riskIfFailed: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  guidance: string;
}

interface ChecklistSection {
  sectionId: string;
  sectionName: string;
  clause: string;
  questions: ChecklistQuestion[];
}

interface ChecklistResult {
  standard: string;
  standardFullName: string;
  totalQuestions: number;
  sections: ChecklistSection[];
  estimatedDurationHours: number;
}

const SectionBlock = ({ section }: { section: ChecklistSection }) => {
  const [expanded, setExpanded] = useState(true);
  const count = section.questions?.length ?? 0;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{section.sectionName}</p>
          <p className="text-xs text-muted-foreground">{section.clause}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {count} question{count === 1 ? '' : 's'}
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border p-3">
          {(section.questions || []).map((q) => (
            <div key={q.id} className="rounded-lg bg-secondary/60 p-3">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{q.question}</p>
                <Badge variant={riskVariant[q.riskIfFailed] || 'slate'} className="shrink-0">
                  {q.riskIfFailed}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Evidence required: {q.evidenceRequired}</p>
              {q.guidance && <p className="mt-1 text-xs text-muted-foreground">{q.guidance}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AIChecklistGenerator = () => {
  const { data, loading, error, execute } = useAIChecklist();
  const checklist = data as ChecklistResult | null;
  const [standard, setStandard] = useState('ISO_9001_2015');
  const [productType, setProductType] = useState('');
  const [processType, setProcessType] = useState('');

  const generate = () =>
    execute({
      standard,
      productType: productType.trim() || undefined,
      processType: processType.trim() || undefined,
    });

  const inputCls = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-accent" /> AI Checklist Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Standard</span>
            <select className={inputCls} value={standard} onChange={(e) => setStandard(e.target.value)}>
              {STANDARDS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Product Type (optional)</span>
            <input
              className={inputCls}
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              placeholder="e.g. Sterile injectable"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Process Type (optional)</span>
            <input
              className={inputCls}
              value={processType}
              onChange={(e) => setProcessType(e.target.value)}
              placeholder="e.g. Batch manufacturing"
            />
          </label>
        </div>

        <Button variant="accent" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
          {loading ? 'AI is building your checklist…' : 'Generate Checklist'}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}

        {checklist && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AIGeneratedBadge />
            </div>

            <div>
              <h3 className="text-lg font-semibold">{checklist.standardFullName}</h3>
              <div className="mt-2 flex flex-wrap gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Questions</p>
                  <p className="text-sm font-semibold tabular-nums">{checklist.totalQuestions}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Est. Duration</p>
                  <p className="text-sm font-semibold tabular-nums">{checklist.estimatedDurationHours}h</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sections</p>
                  <p className="text-sm font-semibold tabular-nums">{checklist.sections?.length ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {(checklist.sections || []).map((section) => (
                <SectionBlock key={section.sectionId} section={section} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
