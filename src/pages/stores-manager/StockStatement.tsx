import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import type { MaterialStockStatement } from '@/types';

export const StockStatement = () => {
  const { stockStatements, materials, materialTypes, addStockStatement, deleteStockStatement, materialPlans } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState({ materialId: '', approved: 0, rejected: 0, pending: 0 });
  const [confirmDel, setConfirmDel] = useState<MaterialStockStatement | null>(null);

  const filtered = useMemo(() => stockStatements.filter((s) => {
    if (search && !s.materialName.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== 'all' && s.category !== catFilter) return false;
    return true;
  }), [stockStatements, search, catFilter]);

  // When material selected, prefill from approved counts in material plans
  const onMatChange = (id: string) => {
    const plans = materialPlans.filter((p) => p.materialId === id);
    const approvedTotal = plans.filter((p) => p.overallStatus === 'APPROVED').reduce((s, p) => s + p.quantity, 0);
    const rejectedTotal = plans.filter((p) => p.overallStatus === 'REJECTED').reduce((s, p) => s + p.quantity, 0);
    const pendingTotal = plans.filter((p) => ['DRAFT', 'SUBMITTED', 'INSPECTED', 'HOLD'].includes(p.overallStatus)).reduce((s, p) => s + p.quantity, 0);
    setForm({ materialId: id, approved: approvedTotal, rejected: rejectedTotal, pending: pendingTotal });
  };

  const submit = () => {
    if (!form.materialId) { toast.error('Material required'); return; }
    const mat = materials.find((m) => m.id === form.materialId)!;
    const type = materialTypes.find((t) => t.id === mat.materialTypeId);
    addStockStatement({
      date: new Date().toISOString(), materialId: mat.id, materialName: mat.name, materialCode: mat.code,
      totalAvailable: form.approved + form.rejected + form.pending,
      approvedCount: form.approved, rejectedCount: form.rejected, pendingCount: form.pending,
      category: type?.name || 'Raw Material', preparedBy: user?.name || 'SM', unit: 'units',
    });
    toast.success('Stock statement created');
    setDrawer(false);
    setForm({ materialId: '', approved: 0, rejected: 0, pending: 0 });
  };

  const exportRows = filtered.map((s) => ({ Date: formatDate(s.date), Material: s.materialName, Code: s.materialCode, Total: s.totalAvailable, Approved: s.approvedCount, Rejected: s.rejectedCount, Pending: s.pendingCount, Category: s.category, PreparedBy: s.preparedBy, Unit: s.unit }));

  return (
    <PageWrapper>
      <PageHeader title="Material Stock Statement" description="Track approved, rejected and pending inventory per material." action={
        <>
          <ExportButtons data={exportRows} fileName="stock-statement" />
          <Button variant="accent" onClick={() => setDrawer(true)}><Plus className="h-4 w-4" /> Create Statement</Button>
        </>
      } />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search material…" className="sm:w-72" />
        <Select value={catFilter} onChange={setCatFilter} options={[{ label: 'All Categories', value: 'all' }, ...materialTypes.map((t) => ({ label: t.name, value: t.name }))]} className="w-48" />
      </div>

      <Card className="overflow-hidden print-area">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Material</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Approved</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Rejected</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Prepared By</th>
                <th className="w-12 px-4 py-3 no-print"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">No stock statements yet</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs">{formatDate(s.date)}</td>
                  <td className="px-4 py-3 font-medium">{s.materialName}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{s.materialCode}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{s.totalAvailable}</td>
                  <td className={cn('px-4 py-3 text-right font-mono font-medium bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400')}>{s.approvedCount}</td>
                  <td className={cn('px-4 py-3 text-right font-mono font-medium bg-red-50/50 dark:bg-red-500/5 text-red-700 dark:text-red-400')}>{s.rejectedCount}</td>
                  <td className={cn('px-4 py-3 text-right font-mono font-medium bg-amber-50/50 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400')}>{s.pendingCount}</td>
                  <td className="px-4 py-3 text-xs">{s.category}</td>
                  <td className="px-4 py-3 text-xs">{s.preparedBy}</td>
                  <td className="px-4 py-3 no-print"><Button variant="ghost" size="icon-sm" onClick={() => setConfirmDel(s)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetHeader><SheetTitle>Create Stock Statement</SheetTitle><SheetDescription>Quantities auto-fill from inspection data; adjust if needed.</SheetDescription></SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Material <span className="text-destructive">*</span></Label>
              <Select value={form.materialId} onChange={onMatChange} options={materials.map((m) => ({ label: m.name, value: m.id }))} placeholder="Select material" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Approved</Label><Input type="number" value={form.approved || ''} onChange={(e) => setForm({ ...form, approved: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-1.5"><Label>Rejected</Label><Input type="number" value={form.rejected || ''} onChange={(e) => setForm({ ...form, rejected: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-1.5"><Label>Pending</Label><Input type="number" value={form.pending || ''} onChange={(e) => setForm({ ...form, pending: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 text-sm flex items-center justify-between">
              <span>Total Available</span>
              <span className="font-mono font-semibold">{form.approved + form.rejected + form.pending}</span>
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setDrawer(false)}>Cancel</Button>
          <Button variant="accent" onClick={submit}>Create</Button>
        </SheetFooter>
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.materialName} onConfirm={() => { if (confirmDel) { deleteStockStatement(confirmDel.id); toast.success('Deleted'); setConfirmDel(null); } }} />
    </PageWrapper>
  );
};
