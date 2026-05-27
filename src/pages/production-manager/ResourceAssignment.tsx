import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { format, eachDayOfInterval, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useData } from '@/context/DataContext';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { cn } from '@/lib/utils';
import type { ResourceAssignment as RA } from '@/types';

export const ResourceAssignment = () => {
  const { resourceAssignments, inspectionPlans, users, roles, addResourceAssignment } = useData();
  const inspectorRole = roles.find((r) => r.name === 'Inspector');
  const inspectors = users.filter((u) => u.roleId === inspectorRole?.id && u.status === 'Active');

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmConflict, setConfirmConflict] = useState<null | (() => void)>(null);
  const [form, setForm] = useState({ planId: '', inspectorId: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<RA | null>(null);

  const unassignedPlans = inspectionPlans.filter((p) => p.status === 'SUBMITTED' || (p.status === 'ACTIVE' && !p.inspectorId));

  const inspectorWorkload = inspectors.map((u) => {
    const active = resourceAssignments.filter((r) => r.inspectorId === u.id && r.status !== 'COMPLETED').length;
    return { user: u, active, percent: Math.min(100, (active / 5) * 100) };
  });

  const exportRows = resourceAssignments.map((r) => ({ Inspector: r.inspectorName, PlanType: r.planType, Product: r.productName, Stage: r.stageName, Date: format(new Date(r.assignedDate), 'yyyy-MM-dd'), Status: r.status }));

  const submit = (force = false) => {
    if (!form.planId || !form.inspectorId || !form.date) { toast.error('All fields required'); return; }
    const conflict = resourceAssignments.find((r) => r.inspectorId === form.inspectorId && isSameDay(new Date(r.assignedDate), new Date(form.date)));
    if (conflict && !force) {
      setConfirmConflict(() => () => submit(true));
      return;
    }
    setBusy(true);
    const plan = inspectionPlans.find((p) => p.id === form.planId);
    const insp = inspectors.find((u) => u.id === form.inspectorId);
    if (!plan || !insp) { setBusy(false); return; }
    addResourceAssignment({
      inspectorId: insp.id, inspectorName: insp.name, planId: plan.id, planType: plan.planCode,
      productName: plan.productName, stageName: plan.stageName || plan.componentName || plan.materialName || '—',
      assignedDate: new Date(form.date).toISOString(), status: 'ASSIGNED',
    });
    setTimeout(() => {
      toast.success('Resource assigned successfully');
      setBusy(false); setDrawerOpen(false); setForm({ planId: '', inspectorId: '', date: format(new Date(), 'yyyy-MM-dd') });
      setConfirmConflict(null);
    }, 300);
  };

  return (
    <PageWrapper>
      <PageHeader title="Resource Assignments" description="Assign inspectors to inspection plans." action={<>
        <ExportButtons data={exportRows} fileName="resource-assignments" />
        <Button variant="accent" onClick={() => setDrawerOpen(true)}><Plus className="h-4 w-4" /> Assign Resource</Button>
      </>} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Weekly Timeline</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>‹ Prev</Button>
              <span className="text-xs font-medium px-2">{format(weekStart, 'MMM dd')} — {format(addDays(weekStart, 6), 'MMM dd, yyyy')}</span>
              <Button size="sm" variant="outline" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>Next ›</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground w-32">Inspector</th>
                    {days.map((d) => (
                      <th key={d.toString()} className={cn('px-1 py-2 font-medium text-muted-foreground text-center', isSameDay(d, new Date()) && 'text-accent')}>
                        <div className="text-[10px] uppercase tracking-wider">{format(d, 'EEE')}</div>
                        <div className="text-sm">{format(d, 'd')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inspectors.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="px-2 py-3"><div className="flex items-center gap-2"><Avatar name={u.name} size="sm" /><span className="font-medium text-xs truncate">{u.name.split(' ')[0]}</span></div></td>
                      {days.map((d) => {
                        const assignments = resourceAssignments.filter((r) => r.inspectorId === u.id && isSameDay(new Date(r.assignedDate), d));
                        return (
                          <td key={d.toString()} className="px-1 py-2 align-top">
                            <div className="flex flex-col gap-1">
                              {assignments.map((a) => (
                                <motion.button key={a.id} whileHover={{ scale: 1.04 }} onClick={() => setDetail(a)}
                                  className={cn('px-1.5 py-1 rounded text-[10px] font-medium text-left truncate',
                                    a.status === 'COMPLETED' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                                    a.status === 'IN_PROGRESS' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                                    a.status === 'ASSIGNED' && 'bg-accent/15 text-accent'
                                  )}>
                                  {a.stageName}
                                </motion.button>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Inspector Workload</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {inspectorWorkload.map(({ user, active, percent }) => (
              <div key={user.id} className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={user.name} size="sm" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user.name}</p><p className="text-[10px] text-muted-foreground">{active} active task{active !== 1 ? 's' : ''}</p></div>
                  <Badge variant={percent < 50 ? 'success' : percent < 80 ? 'warning' : 'danger'}>{percent.toFixed(0)}%</Badge>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all',
                    percent < 50 ? 'bg-emerald-500' : percent < 80 ? 'bg-amber-500' : 'bg-red-500'
                  )} style={{ width: `${percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={(o) => !busy && setDrawerOpen(o)}>
        <SheetHeader><SheetTitle>Assign Resource</SheetTitle><SheetDescription>Assign an inspector to a submitted plan.</SheetDescription></SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Plan <span className="text-destructive">*</span></Label>
              <Select value={form.planId} onChange={(v) => setForm({ ...form, planId: v })} options={unassignedPlans.map((p) => ({ label: `${p.planCode} — ${p.productName}`, value: p.id }))} placeholder={unassignedPlans.length ? 'Select plan' : 'No unassigned plans'} />
            </div>
            <div className="space-y-1.5">
              <Label>Inspector <span className="text-destructive">*</span></Label>
              <Select value={form.inspectorId} onChange={(v) => setForm({ ...form, inspectorId: v })} options={inspectors.map((u) => ({ label: u.name, value: u.id }))} placeholder="Select inspector" />
            </div>
            <div className="space-y-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setDrawerOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="accent" onClick={() => submit()} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Assign</Button>
        </SheetFooter>
      </Sheet>

      <Dialog open={!!confirmConflict} onOpenChange={(o) => !o && setConfirmConflict(null)}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15 shrink-0"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div><DialogTitle>Scheduling Conflict</DialogTitle><DialogDescription className="mt-1.5">Inspector already has an assignment on this date. Proceed anyway?</DialogDescription></div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirmConflict(null)}>Cancel</Button>
          <Button variant="accent" onClick={() => confirmConflict?.()}>Proceed</Button>
        </DialogFooter>
      </Dialog>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        {detail && (
          <>
            <SheetHeader><SheetTitle>Assignment Detail</SheetTitle></SheetHeader>
            <SheetBody>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Inspector</dt><dd className="mt-1">{detail.inspectorName}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Plan</dt><dd className="mt-1 font-mono">{detail.planType}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Product</dt><dd className="mt-1">{detail.productName}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Stage</dt><dd className="mt-1">{detail.stageName}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Date</dt><dd className="mt-1">{format(new Date(detail.assignedDate), 'PP')}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt><dd className="mt-1"><Badge variant={detail.status === 'COMPLETED' ? 'success' : detail.status === 'IN_PROGRESS' ? 'warning' : 'accent'}>{detail.status}</Badge></dd></div>
              </dl>
            </SheetBody>
          </>
        )}
      </Sheet>
    </PageWrapper>
  );
};
