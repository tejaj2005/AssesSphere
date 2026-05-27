import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InspectionForm } from '@/components/inspector/InspectionForm';
import { ReviewBadge } from '@/components/dashboard/RAGBadge';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { InspectorReportType, InspectionReport, ReportParameter } from '@/types';

interface ReportListPageProps {
  type: InspectorReportType;
  title: string;
  description: string;
  prominentBadge?: string;
}

const calcVar = (target: number, actual: number) => target === 0 ? 0 : ((actual - target) / target) * 100;
const ragOf = (v: number): 'GREEN' | 'AMBER' | 'RED' => { const x = Math.abs(v); return x <= 2 ? 'GREEN' : x <= 5 ? 'AMBER' : 'RED'; };

export const ReportListPage = ({ type, title, description, prominentBadge }: ReportListPageProps) => {
  const { inspectionReports, inspectorTasks, inspectionPlans, materialPlans, checklists } = useData();
  const [openReport, setOpenReport] = useState<InspectionReport | null>(null);
  const [taskId, setTaskId] = useState<string | undefined>();

  // Type-mapping for legacy/internal: COMPONENT/ASSEMBLY/FINAL_PRODUCT/MATERIAL/CALIBRATION
  const myReports = useMemo(() => inspectionReports.filter((r) => {
    if (type === 'MATERIAL') return r.type === 'MATERIAL';
    if (type === 'COMPONENT') return r.type === 'COMPONENT' && (r.componentName || r.stageName);
    if (type === 'ASSEMBLY') return r.type === 'ASSEMBLY';
    if (type === 'FINAL_PRODUCT') return r.type === 'FINAL_PRODUCT';
    return false;
  }), [inspectionReports, type]);

  const openExisting = (r: InspectionReport) => {
    const task = inspectorTasks.find((t) => t.reportId === r.id);
    setTaskId(task?.id);
    setOpenReport(r);
  };

  const startNew = () => {
    // Generate scaffold from any open plan
    const planSource = type === 'MATERIAL' ? materialPlans.find((p) => p.overallStatus === 'SUBMITTED' || p.overallStatus === 'INSPECTED') : null;
    const plan = type !== 'MATERIAL' ? inspectionPlans.find((p) => {
      const matches = type === 'COMPONENT' ? p.type === 'MANUFACTURING' || p.type === 'COMPONENT' : type === 'ASSEMBLY' ? p.type === 'ASSEMBLING' : false;
      return matches && p.status === 'ACTIVE';
    }) : null;
    const params: ReportParameter[] = (planSource?.parameters || plan?.parameters || []).map((pp) => ({
      id: `np-${Math.random().toString(36).slice(2, 8)}`, parameterName: pp.parameterName, unit: pp.unit, targetValue: pp.targetValue, readings: [], actualValue: 0, variance: 0, status: 'GREEN', equipment: (pp as any).equipmentName || 'Equipment',
    }));
    let checklistItems = undefined;
    if (type === 'ASSEMBLY' || type === 'FINAL_PRODUCT') {
      const ct = type === 'ASSEMBLY' ? 'ASSEMBLING' : 'FINAL_PRODUCT';
      const cl = checklists.find((c) => c.type === ct);
      if (cl) checklistItems = cl.items.map((it) => ({ id: `nc-${Math.random().toString(36).slice(2, 8)}`, item: it.item, result: 'PENDING' as const }));
    }
    const stub: InspectionReport = {
      id: 'new', reportCode: `IR-${type.slice(0, 3)}-NEW`, type, productName: plan?.productName || planSource?.productName || 'Product',
      materialName: planSource?.materialName, supplierName: planSource?.supplierName,
      stageName: plan?.stageName, componentName: plan?.componentName,
      parameters: params, checklistItems, observations: '', evidenceFiles: [], overallStatus: 'APPROVED',
      inspectorId: 'self', inspectorName: 'Inspector', inspectionDate: new Date().toISOString(), reportStatus: 'ASSIGNED',
    };
    setOpenReport(stub); setTaskId(undefined);
  };

  if (openReport) {
    return (
      <PageWrapper>
        <Button variant="ghost" size="sm" onClick={() => setOpenReport(null)} className="mb-2"><ArrowLeft className="h-4 w-4" /> Back to list</Button>
        <PageHeader title={openReport.reportCode === 'IR-' + type.slice(0, 3) + '-NEW' ? `New ${title} Report` : openReport.reportCode}
          description={`${openReport.productName} · ${openReport.materialName || openReport.componentName || openReport.stageName || ''}`}
          meta={prominentBadge && <Badge variant="danger" className="text-sm py-1">{prominentBadge}</Badge>} />
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {openReport.materialName && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Material</dt><dd>{openReport.materialName}</dd></div>}
            {openReport.supplierName && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Supplier</dt><dd>{openReport.supplierName}</dd></div>}
            {openReport.componentName && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Component</dt><dd>{openReport.componentName}</dd></div>}
            {openReport.stageName && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Stage</dt><dd>{openReport.stageName}</dd></div>}
            {openReport.assemblerResource && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Assembler</dt><dd>{openReport.assemblerResource}</dd></div>}
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt><dd><ReviewBadge status={openReport.reportStatus === 'SUBMITTED' || openReport.reportStatus === 'L1_APPROVED' ? 'PENDING' : openReport.reportStatus === 'FINAL_APPROVED' ? 'APPROVED' : openReport.reportStatus === 'REJECTED' ? 'REJECTED' : 'PENDING'} /></dd></div>
          </div>
        </Card>
        <InspectionForm type={type} report={openReport.id === 'new' ? undefined : openReport} taskId={taskId} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader title={title} description={description} action={<Button variant="accent" onClick={startNew}>Start New Report</Button>} />

      {myReports.length === 0 ? (
        <Card className="p-12 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm font-medium">No reports yet</p><p className="text-xs text-muted-foreground mb-4">Click "Start New Report" to begin.</p></Card>
      ) : (
        <div className="space-y-3">
          {myReports.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={cn('p-4 hover:shadow-md cursor-pointer', r.reportStatus === 'REJECTED' && 'border-l-4 border-l-red-500')} onClick={() => openExisting(r)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-medium">{r.reportCode}</span><span className="text-xs text-muted-foreground">·</span><span className="font-semibold">{r.productName}</span><span className="text-sm">{r.materialName || r.componentName || r.stageName}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(r.inspectionDate)}{r.l1ReviewerName && ` · L1: ${r.l1ReviewerName}`}{r.qmReviewerName && ` · QM: ${r.qmReviewerName}`}</p>
                    {r.l1Comment && r.reportStatus === 'REJECTED' && <p className="text-xs text-red-700 dark:text-red-400 italic mt-1">"{r.l1Comment}"</p>}
                  </div>
                  <ReviewBadge status={r.reportStatus === 'SUBMITTED' || r.reportStatus === 'L1_APPROVED' ? 'PENDING' : r.reportStatus === 'FINAL_APPROVED' ? 'APPROVED' : r.reportStatus === 'REJECTED' ? 'REJECTED' : 'PENDING'} />
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
