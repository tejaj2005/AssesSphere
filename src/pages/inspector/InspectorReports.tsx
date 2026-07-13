import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InspectionForm } from '@/components/inspector/InspectionForm';
import { AIFindingsPanel, FindingsInspectionData } from '@/components/ai/AIFindingsPanel';
import { AIEvidenceValidator } from '@/components/ai/AIEvidenceValidator';
import { ReviewBadge } from '@/components/dashboard/RAGBadge';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { InspectorReportType, ReviewStatus } from '@/types';

interface ReportListPageProps {
  type: InspectorReportType;
  title: string;
  description: string;
  prominentBadge?: string;
}

/** Mock InspectorReportType -> backend InspectionPlan.planType (see server/models/InspectionPlan.ts). */
const PLAN_TYPE: Record<string, string> = {
  MATERIAL: 'R1_MATERIAL',
  COMPONENT: 'R2_COMPONENT',
  ASSEMBLY: 'R4_ASSEMBLY',
  FINAL_PRODUCT: 'R5_FINAL',
};

const statusToReview = (status: string): ReviewStatus =>
  status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING';

export const ReportListPage = ({ type, title, description, prominentBadge }: ReportListPageProps) => {
  const { user } = useAuth();
  const planType = PLAN_TYPE[type];

  // Backend has no InspectionReport.planType filter (only the referenced plan does), so
  // fetch this org's reports and filter client-side by the populated plan.planType.
  const { items: reports, loading: reportsLoading } = useApiResource<any>('/inspection-reports', {
    organization: user?.organization || '',
  });
  // Active plan(s) of this type assigned to me — used to scaffold a new report.
  const { items: activePlans } = useApiResource<any>('/inspection-plans', {
    organization: user?.organization || '', planType, inspector: user?.id || '', status: 'ACTIVE',
  });

  const [openReport, setOpenReport] = useState<any | null>(null);
  const [formKey, setFormKey] = useState(0);

  const myReports = useMemo(() => reports.filter((r) => r.plan?.planType === planType), [reports, planType]);

  const openExisting = (r: any) => setOpenReport(r);

  const startNew = () => {
    const plan = activePlans[0];
    if (!plan) { toast.error('No active inspection plan assigned to you for this report type'); return; }
    setOpenReport({
      id: 'new', reportId: `New ${title}`, plan,
      checklistResults: [], observations: '', evidenceFiles: [], status: 'DRAFT',
      inspectionDate: new Date().toISOString(),
    });
    setFormKey((k) => k + 1);
  };

  if (openReport) {
    const isNew = openReport.id === 'new';
    return (
      <PageWrapper>
        <Button variant="ghost" size="sm" onClick={() => setOpenReport(null)} className="mb-2"><ArrowLeft className="h-4 w-4" /> Back to list</Button>
        <PageHeader title={isNew ? `New ${title} Report` : openReport.reportId}
          description={openReport.plan?.title || ''}
          meta={prominentBadge && <Badge variant="danger" className="text-sm py-1">{prominentBadge}</Badge>} />
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Plan</dt><dd>{openReport.plan?.title || openReport.plan?.planId || '—'}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Inspection Date</dt><dd>{formatDate(openReport.inspectionDate)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt><dd><ReviewBadge status={statusToReview(openReport.status)} /></dd></div>
            {openReport.rejectionReason && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Rejection Reason</dt><dd className="text-red-600 dark:text-red-400">{openReport.rejectionReason}</dd></div>}
          </div>
        </Card>
        {(() => {
          const items = (openReport.checklistResults || [])
            .filter((c: any) => c.result && c.result !== 'NA')
            .map((c: any) => ({
              parameter: c.parameter,
              specificationValue: c.specificationValue,
              actualValue: c.actualValue,
              result: (c.result === 'MARGINAL' ? 'MARGINAL' : c.result === 'FAIL' ? 'FAIL' : 'PASS') as 'PASS' | 'MARGINAL' | 'FAIL',
            }));
          if (!items.length) return null;
          const inspectionData: FindingsInspectionData = {
            inspectionReportId: isNew ? (openReport.plan?.planId || 'NEW') : (openReport.reportId || openReport.id),
            productName: openReport.plan?.title || 'Product',
            inspectionType: type,
            stage: openReport.plan?.title || type,
            checklistItems: items,
            inspector: user?.name,
            inspectionDate: openReport.inspectionDate,
          };
          const onAccepted = (f: Record<string, any>) => {
            const parts: string[] = [];
            if (f.executiveSummary) parts.push(f.executiveSummary);
            (f.nonConformities || []).forEach((nc: any) =>
              parts.push(`[${nc.severity}] ${nc.findingId}: ${nc.description}${nc.immediateAction ? ` — Action: ${nc.immediateAction}` : ''}`));
            const text = parts.join('\n');
            setOpenReport((prev: any) => (prev ? { ...prev, observations: [prev.observations, text].filter(Boolean).join('\n\n') } : prev));
            setFormKey((k) => k + 1);
            toast.success('AI findings added to observations');
          };
          return (
            <div className="mb-4">
              <AIFindingsPanel inspectionData={inspectionData} onAccepted={onAccepted} />
            </div>
          );
        })()}
        <div className="mb-4">
          <AIEvidenceValidator />
        </div>
        <InspectionForm key={`${openReport.id}-${formKey}`} type={type} report={openReport} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader title={title} description={description} action={<Button variant="accent" onClick={startNew}>Start New Report</Button>} />

      {reportsLoading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading reports…</Card>
      ) : myReports.length === 0 ? (
        <Card className="p-12 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm font-medium">No reports yet</p><p className="text-xs text-muted-foreground mb-4">Click "Start New Report" to begin.</p></Card>
      ) : (
        <div className="space-y-3">
          {myReports.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={cn('p-4 hover:shadow-md cursor-pointer', r.status === 'REJECTED' && 'border-l-4 border-l-red-500')} onClick={() => openExisting(r)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-medium">{r.reportId}</span><span className="text-xs text-muted-foreground">·</span><span className="font-semibold">{r.plan?.title || 'Report'}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(r.inspectionDate)}</p>
                    {r.rejectionReason && r.status === 'REJECTED' && <p className="text-xs text-red-700 dark:text-red-400 italic mt-1">"{r.rejectionReason}"</p>}
                  </div>
                  <ReviewBadge status={statusToReview(r.status)} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
};

export const MaterialReports = () => <ReportListPage type="MATERIAL" title="Material Inspection Reports" description="Inspection reports for incoming materials." />;
export const ComponentReports = () => <ReportListPage type="COMPONENT" title="Component Inspection Reports" description="Component inspections (use 3-reading average for accuracy)." />;
export const AssemblyReports = () => <ReportListPage type="ASSEMBLY" title="Assembly Inspection Reports" description="Assembly stage inspections with checklists." />;
export const FinalProductReports = () => <ReportListPage type="FINAL_PRODUCT" title="Final Product Inspection" description="Shipment-clearance final inspection." prominentBadge="SHIPMENT CLEARANCE INSPECTION" />;
