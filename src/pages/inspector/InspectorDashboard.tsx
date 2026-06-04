import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Clock, XCircle, Calendar, AlertTriangle, ArrowRight, Layers, Puzzle, Wrench, Package, FlaskConical } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { useData } from '@/context/DataContext';
import { staggerContainer, staggerItem, pendingPulse } from '@/lib/animations';
import { formatDate, relativeTime, cn } from '@/lib/utils';
import type { InspectorTask } from '@/types';

const TYPE_ICON = { MATERIAL: Layers, COMPONENT: Puzzle, ASSEMBLY: Wrench, FINAL_PRODUCT: Package, CALIBRATION: FlaskConical };
const ROUTE_FOR = (type: string, planId: string) => {
  if (type === 'MATERIAL') return `/inspector/material-reports?plan=${planId}`;
  if (type === 'COMPONENT') return `/inspector/component-reports?plan=${planId}`;
  if (type === 'ASSEMBLY') return `/inspector/assembly-reports?plan=${planId}`;
  if (type === 'FINAL_PRODUCT') return `/inspector/final-product-reports?plan=${planId}`;
  return '/inspector/calibration-report';
};

export const InspectorDashboard = () => {
  const { inspectorTasks, inspectionReports } = useData();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [from, setFrom] = useState('');

  const sorted = useMemo(() => [...inspectorTasks].filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (from && t.dueDate < from) return false;
    return true;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [inspectorTasks, typeFilter, statusFilter, from]);

  const rejected = inspectorTasks.filter((t) => t.status === 'REJECTED');
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = inspectorTasks.filter((t) => t.status === 'APPROVED').length;
  const pending = inspectorTasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'SUBMITTED').length;

  const exportRows = sorted.map((t) => ({ Plan: t.planCode, Type: t.type, Product: t.productName, Stage: t.stageName, Due: formatDate(t.dueDate), Status: t.status }));

  return (
    <PageWrapper>
      <PageHeader title="My Dashboard" description="Tasks assigned to you, sorted by due date." action={<ExportButtons data={exportRows} fileName="my-tasks" />} />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Total Assigned" value={inspectorTasks.length} icon={ClipboardList} variant="accent" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Completed" value={completedToday} icon={CheckCircle2} variant="success" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Pending" value={pending} icon={Clock} variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Rejected / Rework" value={rejected.length} icon={XCircle} variant="danger" /></motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Select value={typeFilter} onChange={setTypeFilter} options={[{ label: 'All Types', value: 'all' }, { label: 'Material', value: 'MATERIAL' }, { label: 'Component', value: 'COMPONENT' }, { label: 'Assembly', value: 'ASSEMBLY' }, { label: 'Final Product', value: 'FINAL_PRODUCT' }, { label: 'Calibration', value: 'CALIBRATION' }]} className="w-44" />
            <Select value={statusFilter} onChange={setStatusFilter} options={[{ label: 'All Status', value: 'all' }, { label: 'Assigned', value: 'ASSIGNED' }, { label: 'Submitted', value: 'SUBMITTED' }, { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' }]} className="w-40" />
            <DateRangeFilter from={from} onChange={(f) => setFrom(f)} singleDate />
          </div>

          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            <AnimatePresence>
              {sorted.map((t) => {
                const Icon = TYPE_ICON[t.type];
                const overdue = new Date(t.dueDate) < new Date() && t.status === 'ASSIGNED';
                return (
                  <motion.div key={t.id} variants={staggerItem} layout>
                    <Card className={cn('p-4 hover:shadow-md cursor-pointer transition-shadow',
                      t.status === 'REJECTED' && 'border-l-4 border-l-red-500',
                      overdue && 'border-l-4 border-l-amber-500'
                    )} onClick={() => navigate(ROUTE_FOR(t.type, t.planId))}>
                      <div className="flex items-start gap-3">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                          t.type === 'MATERIAL' && 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                          t.type === 'COMPONENT' && 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
                          t.type === 'ASSEMBLY' && 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
                          t.type === 'FINAL_PRODUCT' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                          t.type === 'CALIBRATION' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold">{t.productName}</p>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-sm">{t.stageName}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">{t.planCode}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {formatDate(t.dueDate)} {overdue && <span className="text-amber-600 font-medium">(overdue)</span>}</span>
                            <span>· {t.equipment}</span>
                          </p>
                          {t.rejectionComment && <p className="text-xs text-red-600 dark:text-red-400 mt-2 italic">"{t.rejectionComment}"</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge variant={t.status === 'APPROVED' ? 'success' : t.status === 'REJECTED' ? 'danger' : t.status === 'SUBMITTED' ? 'warning' : 'accent'}>{t.status}</Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {sorted.length === 0 && <Card className="p-12 text-center text-sm text-muted-foreground">No tasks match the filters.</Card>}
          </motion.div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Rework / Notifications</CardTitle></CardHeader>
            <CardContent>
              {rejected.length === 0 ? <p className="text-xs text-muted-foreground">No rejected tasks. Great job!</p> : (
                <ul className="space-y-2">
                  {rejected.map((r) => (
                    <motion.li key={r.id} variants={pendingPulse} animate="animate" className="p-2 rounded-lg border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-500/5">
                      <p className="text-xs font-semibold">{r.planCode}</p>
                      <p className="text-xs text-muted-foreground">{r.stageName}</p>
                      <p className="text-[10px] text-red-700 dark:text-red-400 italic mt-1">"{r.rejectionComment}"</p>
                      <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => navigate(ROUTE_FOR(r.type, r.planId))}>Re-open</Button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Report History</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {inspectionReports.slice(0, 8).map((r) => (
                  <li key={r.id} className="p-2 rounded-md border text-xs">
                    <div className="flex items-center justify-between mb-1"><span className="font-mono font-medium">{r.reportCode}</span><Badge variant={r.reportStatus === 'FINAL_APPROVED' ? 'success' : r.reportStatus === 'REJECTED' ? 'danger' : 'warning'}>{r.reportStatus.replace('_', ' ')}</Badge></div>
                    <p className="text-muted-foreground">{r.productName} · {r.stageName || r.componentName || r.materialName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(r.inspectionDate)}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};
