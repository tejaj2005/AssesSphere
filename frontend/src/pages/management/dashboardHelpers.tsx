import { useState, useMemo } from 'react';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { RAGBadge, ReviewBadge } from '@/components/dashboard/RAGBadge';
import { formatDate, cn } from '@/lib/utils';
import type { InspectionRecord, InspectionRecordType, RAGStatus, ReviewStatus } from '@/types';
import { Column } from '@/components/shared/DataTable';

/** Backend InspectionPlan.planType -> mock InspectionRecord.type. */
export const PLAN_TYPE_TO_RECORD_TYPE: Record<string, InspectionRecordType> = {
  R1_MATERIAL: 'MATERIAL',
  R2_COMPONENT: 'COMPONENT',
  R3_MANUFACTURING: 'MANUFACTURING',
  R4_ASSEMBLY: 'ASSEMBLING',
  R5_FINAL: 'FINAL_PRODUCT',
};

/** Backend InspectionReport.status -> mock InspectionRecord.reviewStatus. */
export function mapReviewStatus(status?: string): ReviewStatus {
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'ON_HOLD') return 'INFO_REQUESTED';
  return 'PENDING';
}

/** Backend checklistResult.result (or report.overallResult as a fallback) -> mock RAGStatus. */
function ragFromResult(result?: string): RAGStatus {
  if (result === 'FAIL') return 'RED';
  if (result === 'MARGINAL' || result === 'CONDITIONAL') return 'AMBER';
  return 'GREEN';
}

interface ReportsToRecordsOpts {
  /** Restrict to these InspectionPlan.planType values; omit to include every type (used by the product-wide overview). */
  planTypes?: string[];
  /** Which plan field holds the stage ref (not populated by GET /inspection-plans, so it arrives as a raw id string). */
  stageKey?: 'manufacturingStage' | 'assemblyStage';
  /** id -> name lookup for the stage referenced by `stageKey` (build from the full stage list used for filter dropdowns). */
  stageMap?: Record<string, string>;
  /** id -> name lookup for `plan.supplier` (not populated by GET /inspection-plans). */
  supplierMap?: Record<string, string>;
}

/**
 * Flattens live InspectionReport documents (as returned by GET /inspection-reports, where `plan` is
 * populated with only `planId title planType`) into InspectionRecord-shaped rows the existing
 * dashboards/columns/detail-sheet already know how to render. `plans` should be the matching
 * InspectionPlan list (GET /inspection-plans, which populates `product`/`material`) so we can recover
 * product/material names and join back to each report via `report.plan._id`.
 * One row is emitted per `checklistResults` entry (one row per inspected parameter); reports with no
 * checklist results yet fall back to a single placeholder row so counts still reflect them.
 */
export function reportsToRecords(reports: any[], plans: any[], opts: ReportsToRecordsOpts = {}): InspectionRecord[] {
  const plansById = new Map(plans.map((p: any) => [String(p._id ?? p.id), p]));
  const records: InspectionRecord[] = [];

  reports.forEach((r: any) => {
    const planRef = r.plan;
    const planType: string | undefined = typeof planRef === 'string' ? undefined : planRef?.planType;
    if (opts.planTypes && (!planType || !opts.planTypes.includes(planType))) return;

    const planIdRaw = typeof planRef === 'string' ? planRef : planRef?._id;
    const plan = planIdRaw ? plansById.get(String(planIdRaw)) : undefined;
    const product = plan?.product;
    const material = plan?.material;

    const stageIdRaw = opts.stageKey ? plan?.[opts.stageKey] : undefined;
    const stageId = stageIdRaw ? String(stageIdRaw) : undefined;
    const stageName = stageId ? opts.stageMap?.[stageId] : undefined;

    const supplierIdRaw = plan?.supplier;
    const supplierName = supplierIdRaw ? opts.supplierMap?.[String(supplierIdRaw)] : undefined;

    const type = (planType && PLAN_TYPE_TO_RECORD_TYPE[planType]) || 'MANUFACTURING';
    const reviewStatus = mapReviewStatus(r.status);
    const reviewedBy = r.approvedBy?.name || r.reviewedBy?.name;
    const reviewedDate = r.approvedAt || r.reviewedAt;

    const items = Array.isArray(r.checklistResults) && r.checklistResults.length
      ? r.checklistResults
      : [{ parameter: plan?.title || 'Inspection', specificationValue: '', actualValue: '', result: r.overallResult }];

    items.forEach((c: any, idx: number) => {
      const target = parseFloat(c.specificationValue);
      const actual = parseFloat(c.actualValue);
      const variance = typeof c.variancePercent === 'number'
        ? c.variancePercent
        : (Number.isFinite(target) && target !== 0 && Number.isFinite(actual)) ? ((actual - target) / target) * 100 : 0;

      records.push({
        id: `${r._id ?? r.id}-${idx}`,
        date: r.inspectionDate,
        productId: product?._id ?? product?.id ?? '',
        productName: product?.name ?? plan?.title ?? 'Unknown',
        productCode: product?.productId ?? '',
        type,
        stageId,
        stageName,
        materialId: material?._id ?? material?.id,
        materialName: material?.name,
        supplierName,
        inspectionDetails: r.observations || r.nonConformities || plan?.title || '',
        parameterName: c.parameter || '—',
        unit: c.unit || plan?.checklistTemplate?.[idx]?.unit || '',
        targetValue: Number.isFinite(target) ? target : 0,
        actualValue: Number.isFinite(actual) ? actual : 0,
        variance,
        status: ragFromResult(c.result === 'NA' ? r.overallResult : c.result),
        inspectorName: r.inspector?.name || '—',
        inspectorId: r.inspector?._id ?? (typeof r.inspector === 'string' ? r.inspector : ''),
        reviewedBy,
        reviewedDate,
        reviewStatus,
        observations: r.observations,
      });
    });
  });

  return records;
}

export function useDashboardFilters(records: InspectionRecord[], filterType?: InspectionRecord['type']) {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterState, setFilterState] = useState<Record<string, string>>({});

  const filtered = useMemo(() => records.filter((r) => {
    if (filterType && r.type !== filterType) return false;
    if (search && !(`${r.productName} ${r.parameterName} ${r.inspectorName}`.toLowerCase().includes(search.toLowerCase()))) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to + 'T23:59:59') return false;
    for (const k in filterState) {
      const v = filterState[k];
      if (!v || v === 'all') continue;
      if (k === 'productId' && r.productId !== v) return false;
      if (k === 'status' && r.status !== v) return false;
      if (k === 'stageId' && r.stageId !== v) return false;
      if (k === 'materialId' && r.materialId !== v) return false;
      if (k === 'supplierName' && r.supplierName !== v) return false;
    }
    return true;
  }), [records, filterType, search, from, to, filterState]);

  return { filtered, search, setSearch, from, setFrom, to, setTo, filterState, setFilterState };
}

export const VarianceCell = ({ rec }: { rec: InspectionRecord }) => (
  <span className={cn('font-mono text-xs font-medium',
    rec.status === 'RED' && 'text-red-600 dark:text-red-400',
    rec.status === 'AMBER' && 'text-amber-600 dark:text-amber-400',
    rec.status === 'GREEN' && 'text-emerald-600 dark:text-emerald-400'
  )}>{rec.variance.toFixed(2)}%</span>
);

interface DetailSheetProps {
  record: InspectionRecord | null;
  onClose: () => void;
}

export const InspectionDetailSheet = ({ record, onClose }: DetailSheetProps) => (
  <Sheet open={!!record} onOpenChange={(o) => !o && onClose()} className="!w-[600px]">
    {record && (
      <>
        <SheetHeader>
          <SheetTitle>Inspection {record.id}</SheetTitle>
          <SheetDescription>{record.productName} · {record.parameterName}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RAGBadge status={record.status} />
              <ReviewBadge status={record.reviewStatus} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {record.stageName && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Stage</dt><dd className="mt-1">{record.stageName}</dd></div>}
              {record.materialName && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Material</dt><dd className="mt-1">{record.materialName}</dd></div>}
              {record.supplierName && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Supplier</dt><dd className="mt-1">{record.supplierName}</dd></div>}
              {record.componentName && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Component</dt><dd className="mt-1">{record.componentName}</dd></div>}
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Date</dt><dd className="mt-1">{formatDate(record.date)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Inspector</dt><dd className="mt-1">{record.inspectorName}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Target</dt><dd className="mt-1 font-mono">{record.targetValue} {record.unit}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Actual</dt><dd className="mt-1 font-mono">{record.actualValue} {record.unit}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Variance</dt><dd className="mt-1"><VarianceCell rec={record} /></dd></div>
              {record.equipmentUsed && <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Equipment</dt><dd className="mt-1">{record.equipmentUsed}</dd></div>}
            </dl>
            {record.observations && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observations</p><p className="text-sm">{record.observations}</p></div>}
            {record.reviewedBy && <div className="pt-3 border-t"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Review</p><p className="text-sm">{record.reviewedBy} on {formatDate(record.reviewedDate!)}</p>{record.reviewComment && <p className="text-sm mt-2 italic">"{record.reviewComment}"</p>}</div>}
            <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Inspection Details</p><p className="text-sm">{record.inspectionDetails}</p></div>
          </div>
        </SheetBody>
      </>
    )}
  </Sheet>
);

export const standardColumns = (extra: 'mfg' | 'asm' | 'mat' | 'product' = 'product'): Column<InspectionRecord>[] => {
  const base: Column<InspectionRecord>[] = [
    { key: 'date', header: 'Date', sortable: true, sortValue: (r) => r.date, cell: (r) => <span className="text-xs">{formatDate(r.date)}</span> },
    { key: 'product', header: 'Product', sortable: true, sortValue: (r) => r.productName, cell: (r) => <span className="font-medium text-sm">{r.productName}</span> },
  ];
  if (extra === 'mfg') base.push({ key: 'stage', header: 'Mfg Stage', cell: (r) => r.stageName || '—' });
  if (extra === 'asm') base.push({ key: 'stage', header: 'Asm Stage', cell: (r) => r.stageName || '—' });
  if (extra === 'mat') {
    base.push({ key: 'mat', header: 'Material', cell: (r) => r.materialName || '—' });
    base.push({ key: 'sup', header: 'Supplier', cell: (r) => r.supplierName || '—' });
  }
  base.push({ key: 'param', header: 'Parameter', cell: (r) => r.parameterName });
  base.push({ key: 'inspector', header: 'Done By', cell: (r) => <span className="text-xs">{r.inspectorName}</span> });
  base.push({ key: 'target', header: 'Target', cell: (r) => <span className="text-xs font-mono">{r.targetValue} {r.unit}</span> });
  base.push({ key: 'actual', header: 'Actual', cell: (r) => <span className="text-xs font-mono">{r.actualValue} {r.unit}</span> });
  base.push({ key: 'variance', header: 'Variance', cell: (r) => <VarianceCell rec={r} /> });
  base.push({ key: 'status', header: 'Status', cell: (r) => <RAGBadge status={r.status} /> });
  base.push({ key: 'review', header: 'Review', cell: (r) => <ReviewBadge status={r.reviewStatus} /> });
  base.push({ key: 'reviewedBy', header: 'Reviewed By', cell: (r) => <span className="text-xs">{r.reviewedBy || '—'}</span> });
  return base;
};
