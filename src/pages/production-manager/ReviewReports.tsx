import { useState, useMemo } from 'react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/SearchInput';
import { Input } from '@/components/ui/input';
import { ReviewQueue } from '@/components/review/ReviewQueue';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { useData } from '@/context/DataContext';
import { formatDate } from '@/lib/utils';
import type { InspectionRecord, ReviewStatus } from '@/types';

export const ReviewReports = () => {
  const { inspectionRecords, products, manufacturingStages, assemblingStages, components } = useData();
  const [tab, setTab] = useState<'mfg' | 'asm' | 'comp'>('mfg');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('PENDING');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filterFn = (type: InspectionRecord['type']) => inspectionRecords.filter((r) => {
    if (r.type !== type) return false;
    if (productFilter !== 'all' && r.productId !== productFilter) return false;
    if (statusFilter !== 'all' && r.reviewStatus !== statusFilter) return false;
    if (search && !(`${r.parameterName} ${r.stageName} ${r.componentName} ${r.inspectorName}`.toLowerCase().includes(search.toLowerCase()))) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to + 'T23:59:59') return false;
    return true;
  });

  const mfg = useMemo(() => filterFn('MANUFACTURING'), [inspectionRecords, productFilter, statusFilter, search, from, to]);
  const asm = useMemo(() => filterFn('ASSEMBLING'), [inspectionRecords, productFilter, statusFilter, search, from, to]);
  const comp = useMemo(() => filterFn('COMPONENT'), [inspectionRecords, productFilter, statusFilter, search, from, to]);

  const all = tab === 'mfg' ? mfg : tab === 'asm' ? asm : comp;
  const exportRows = all.map((r) => ({ Product: r.productName, Stage: r.stageName || r.componentName, Parameter: r.parameterName, Inspector: r.inspectorName, Date: formatDate(r.date), Variance: `${r.variance.toFixed(2)}%`, Status: r.status, Review: r.reviewStatus }));

  const mfgPending = mfg.filter((r) => r.reviewStatus === 'PENDING').length;
  const asmPending = asm.filter((r) => r.reviewStatus === 'PENDING').length;
  const compPending = comp.filter((r) => r.reviewStatus === 'PENDING').length;

  return (
    <PageWrapper>
      <PageHeader title="Review Inspection Reports" description="Approve, reject or request more information on inspection reports." action={<ExportButtons data={exportRows} fileName="review-reports" />} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="mfg">Manufacturing ({mfgPending})</TabsTrigger>
          <TabsTrigger value="asm">Assembling ({asmPending})</TabsTrigger>
          <TabsTrigger value="comp">Components ({compPending})</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-3 my-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
          <Select value={productFilter} onChange={setProductFilter} options={[{ label: 'All Products', value: 'all' }, ...products.map((p) => ({ label: p.name, value: p.id }))]} className="w-48" />
          <Select value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[{ label: 'All Status', value: 'all' }, { label: 'Pending', value: 'PENDING' }, { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' }, { label: 'Info Requested', value: 'INFO_REQUESTED' }]} className="w-44" />
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        </div>

        <TabsContent value="mfg"><ReviewQueue records={mfg} /></TabsContent>
        <TabsContent value="asm"><ReviewQueue records={asm} /></TabsContent>
        <TabsContent value="comp"><ReviewQueue records={comp} /></TabsContent>
      </Tabs>
    </PageWrapper>
  );
};
