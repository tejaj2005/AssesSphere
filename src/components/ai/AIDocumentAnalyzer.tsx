import { useRef, useState } from 'react';
import { UploadCloud, Loader2, Sparkles, FileSearch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIDocumentIntel } from '@/hooks/useAI';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'accent' | 'purple' | 'teal' | 'slate';

const DOC_TYPE_VARIANT: Record<string, BadgeVariant> = {
  SOP: 'accent',
  Policy: 'purple',
  Procedure: 'accent',
  Certificate: 'success',
  Report: 'outline',
  Checklist: 'success',
  Other: 'slate',
};

const CLASSIFICATION_VARIANT: Record<string, BadgeVariant> = {
  CONFIDENTIAL: 'danger',
  INTERNAL: 'warning',
  PUBLIC: 'success',
};

const RELEVANCE_VARIANT: Record<string, BadgeVariant> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'success',
};

/** Self-contained AI Document Intelligence card: drop/upload a document, get a
 *  structured AI read on its type, classification, compliance relevance, and quality. */
export const AIDocumentAnalyzer = () => {
  const { data, loading, error, execute } = useAIDocumentIntel();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyze = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('document', file);
    execute({}, fd);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-accent" /> AI Document Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-center transition-colors hover:border-accent/60"
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{file ? file.name : 'Drop a PDF, DOCX, TXT or image here, or click to browse'}</p>
          <p className="text-xs text-muted-foreground">Max 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={analyze} disabled={!file || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'AI is analyzing your document…' : 'Analyze Document'}
          </Button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        {data && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <AIGeneratedBadge />
              <Badge variant={DOC_TYPE_VARIANT[data.documentType] || 'slate'}>{data.documentType}</Badge>
              <Badge variant={CLASSIFICATION_VARIANT[data.classification] || 'slate'}>{data.classification}</Badge>
              <Badge variant={RELEVANCE_VARIANT[data.complianceRelevance] || 'slate'}>{data.complianceRelevance} Relevance</Badge>
              <span className="ml-auto flex items-baseline gap-1 text-sm">
                <span className="text-xs text-muted-foreground">Quality Score</span>
                <span className="font-semibold tabular-nums">{data.qualityScore}</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </span>
            </div>

            {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}

            {Array.isArray(data.keyInformation) && data.keyInformation.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Key Information</p>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {data.keyInformation.map((k: { field: string; value: string }, i: number) => (
                    <div key={i} className="flex items-baseline justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-1.5">
                      <dt className="text-xs text-muted-foreground">{k.field}</dt>
                      <dd className="text-right text-sm font-medium">{k.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {Array.isArray(data.relevantStandards) && data.relevantStandards.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Relevant Standards</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                  {data.relevantStandards.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {Array.isArray(data.missingElements) && data.missingElements.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Missing Elements</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                  {data.missingElements.map((m: string, i: number) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}

            {Array.isArray(data.recommendedActions) && data.recommendedActions.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Recommended Actions</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                  {data.recommendedActions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
