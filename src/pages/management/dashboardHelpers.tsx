import { useState, useMemo } from 'react';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription } from '@/components/ui/sheet';
import { RAGBadge, ReviewBadge } from '@/components/dashboard/RAGBadge';
import { formatDate, cn } from '@/lib/utils';
import type { InspectionRecord } from '@/types';
import { Column } from '@/components/shared/DataTable';

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
