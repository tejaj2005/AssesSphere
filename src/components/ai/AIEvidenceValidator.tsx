import { useRef, useState } from 'react';
import { Sparkles, Loader2, UploadCloud, FileCheck2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIEvidenceValidation } from '@/hooks/useAI';

const recommendationVariant: Record<string, 'success' | 'warning' | 'danger' | 'slate'> = {
  ACCEPT: 'success',
  ACCEPT_WITH_NOTE: 'warning',
  REJECT: 'danger',
  REQUEST_MORE: 'slate',
};

const recommendationLabel: Record<string, string> = {
  ACCEPT: 'Accept',
  ACCEPT_WITH_NOTE: 'Accept with Note',
  REJECT: 'Reject',
  REQUEST_MORE: 'Request More',
};

const issueVariant: Record<string, 'danger' | 'warning' | 'accent' | 'slate'> = {
  MISMATCH: 'danger',
  INCOMPLETE: 'warning',
  OUTDATED: 'warning',
  UNCLEAR: 'slate',
  ADDITIONAL_REQUIRED: 'accent',
};

export const AIEvidenceValidator = () => {
  const { data, loading, error, execute } = useAIEvidenceValidation();
  const [assessmentQuestion, setAssessmentQuestion] = useState('');
  const [requirement, setRequirement] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState({ question: false, requirement: false });
  const inputRef = useRef<HTMLInputElement>(null);

  const questionEmpty = assessmentQuestion.trim() === '';
  const requirementEmpty = requirement.trim() === '';
  const canSubmit = !!file && !questionEmpty && !requirementEmpty;

  const validate = async () => {
    setTouched({ question: true, requirement: true });
    if (!canSubmit || !file) return;
    const fd = new FormData();
    fd.append('evidence', file);
    fd.append('assessmentQuestion', assessmentQuestion);
    fd.append('requirement', requirement);
    await execute({}, fd);
  };

  const inputCls = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI Evidence Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Assessment Question</span>
            <input
              className={inputCls}
              value={assessmentQuestion}
              onChange={(e) => setAssessmentQuestion(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, question: true }))}
              placeholder="e.g. Is the calibration certificate up to date?"
            />
            {touched.question && questionEmpty && (
              <span className="mt-1 block text-xs text-danger">Assessment question is required</span>
            )}
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Requirement</span>
            <input
              className={inputCls}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, requirement: true }))}
              placeholder="e.g. Calibration certificate valid within 12 months"
            />
            {touched.requirement && requirementEmpty && (
              <span className="mt-1 block text-xs text-danger">Requirement is required</span>
            )}
          </label>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-5 text-center transition-colors hover:border-accent/60"
        >
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">{file ? file.name : 'Drop evidence (image or document) here, or click to browse'}</p>
          <p className="text-xs text-muted-foreground">Max 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <Button variant="accent" onClick={validate} disabled={!canSubmit || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
          {loading ? 'AI is validating evidence…' : 'Validate Evidence'}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}

        {data && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AIGeneratedBadge />
              <Badge variant={recommendationVariant[data.recommendation] || 'slate'} className="px-3 py-1 text-sm">
                {recommendationLabel[data.recommendation] || data.recommendation}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm">
                Match Score: <span className="font-semibold tabular-nums">{data.matchScore}%</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                {data.isComplete ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-danger" />}
                Complete
              </span>
              <span className="flex items-center gap-1 text-xs">
                {data.isCurrent ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-danger" />}
                Current
              </span>
            </div>

            {data.validationSummary && <p className="text-sm text-muted-foreground">{data.validationSummary}</p>}

            {Array.isArray(data.issues) && data.issues.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Issues</p>
                {data.issues.map((issue: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
                    <Badge variant={issueVariant[issue.type] || 'slate'}>{issue.type}</Badge>
                    <p className="text-sm">{issue.description}</p>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(data.additionalDocumentsRequired) && data.additionalDocumentsRequired.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Additional Documents Required</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                  {data.additionalDocumentsRequired.map((d: string, i: number) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
