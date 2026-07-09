import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2, Copy, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIGeneratedBadge } from './AIGeneratedBadge';
import { useAIReport } from '@/hooks/useAI';

const REPORT_TYPES = [
  { value: 'EXECUTIVE_SUMMARY', label: 'Executive Summary' },
  { value: 'DETAILED_ASSESSMENT', label: 'Detailed Assessment' },
  { value: 'RISK_REPORT', label: 'Risk Report' },
  { value: 'CAPA_STATUS', label: 'CAPA Status' },
  { value: 'SUPPLIER_EVALUATION', label: 'Supplier Evaluation' },
  { value: 'MANAGEMENT_REVIEW', label: 'Management Review' },
];

interface Props {
  prefillData?: { kpis?: Record<string, any>; summaryData?: any };
}

function reportToText(r: any): string {
  const lines = [r.title, '', `Period: ${r.period}`, `Date: ${r.reportDate}`, '', 'EXECUTIVE SUMMARY', r.executiveSummary, ''];
  (r.sections || []).forEach((s: any) => {
    lines.push(s.heading.toUpperCase(), s.content);
    (s.keyPoints || []).forEach((k: string) => lines.push(`  • ${k}`));
    lines.push('');
  });
  if (r.conclusions) lines.push('CONCLUSIONS', r.conclusions, '');
  if (r.recommendations?.length) {
    lines.push('RECOMMENDATIONS');
    r.recommendations.forEach((rec: string, i: number) => lines.push(`  ${i + 1}. ${rec}`));
    lines.push('');
  }
  if (r.appendixNotes) lines.push('APPENDIX', r.appendixNotes);
  return lines.join('\n');
}

export const AIReportGenerator = ({ prefillData }: Props) => {
  const { data, loading, error, execute } = useAIReport();
  const today = new Date().toISOString().split('T')[0];
  const [reportType, setReportType] = useState('EXECUTIVE_SUMMARY');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(today);
  const [organization, setOrganization] = useState('');

  const generate = () =>
    execute({
      reportType,
      period: { from: from || 'N/A', to: to || today },
      organization: organization || undefined,
      kpis: prefillData?.kpis,
      summaryData: prefillData?.summaryData,
    });

  const copy = () => { navigator.clipboard.writeText(reportToText(data)); toast.success('Report copied to clipboard'); };
  const download = () => {
    const blob = new Blob([reportToText(data)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(data.title || 'report').replace(/\s+/g, '_')}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25';

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI Report Generator</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Report Type</span>
            <select className={inputCls} value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Organization (optional)</span>
            <input className={inputCls} value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. QMICS Solutions" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">From</span>
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">To</span>
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        <Button variant="accent" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'AI is drafting your report…' : 'Generate Report'}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}

        {data && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AIGeneratedBadge />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /> Copy</Button>
                <Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4" /> Download TXT</Button>
              </div>
            </div>
            <h3 className="text-lg font-semibold">{data.title}</h3>
            <p className="text-xs text-muted-foreground">{data.period} · {data.reportDate}</p>
            <div className="rounded-lg bg-secondary/60 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Executive Summary</p>
              <p className="text-sm">{data.executiveSummary}</p>
            </div>
            {(data.sections || []).map((s: any, i: number) => (
              <div key={i}>
                <p className="text-sm font-semibold">{s.heading}</p>
                <p className="text-sm text-muted-foreground">{s.content}</p>
                {s.keyPoints?.length > 0 && (
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    {s.keyPoints.map((k: string, j: number) => <li key={j}>{k}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {data.recommendations?.length > 0 && (
              <div>
                <p className="text-sm font-semibold">Recommendations</p>
                <ol className="list-inside list-decimal space-y-0.5 text-sm text-muted-foreground">
                  {data.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
