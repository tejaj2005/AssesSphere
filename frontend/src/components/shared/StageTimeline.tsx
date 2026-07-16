import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Circle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

type StatusKey = 'APPROVED' | 'SUBMITTED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'REJECTED';

const STATUS_STYLE: Record<StatusKey, { Icon: any; cls: string; ring: string; label: string }> = {
  APPROVED:    { Icon: CheckCircle2, cls: 'bg-emerald-500 text-white',  ring: 'ring-emerald-200 dark:ring-emerald-500/30', label: 'Approved' },
  SUBMITTED:   { Icon: Clock,        cls: 'bg-amber-500 text-white',    ring: 'ring-amber-200 dark:ring-amber-500/30',    label: 'Submitted' },
  IN_PROGRESS: { Icon: Clock,        cls: 'bg-accent text-white',       ring: 'ring-accent/30',                            label: 'In Progress' },
  NOT_STARTED: { Icon: Circle,       cls: 'bg-muted text-muted-foreground', ring: 'ring-border',                           label: 'Not Started' },
  REJECTED:    { Icon: XCircle,      cls: 'bg-red-500 text-white',      ring: 'ring-red-200 dark:ring-red-500/30',         label: 'Rejected' },
};

interface StageTimelineProps {
  title?: string;
  defaultProductId?: string;
}

interface ApiStage { _id: string; name: string; sequence: number }
interface ApiProduct { _id: string; name: string; productId: string; manufacturingStages: ApiStage[]; assemblyStages: ApiStage[] }
interface ApiPlan { _id: string; product?: string | { _id: string }; manufacturingStage?: string | { _id: string }; assemblyStage?: string | { _id: string } }
interface ApiReport { _id: string; plan?: string | { _id: string }; status: string; inspectionDate: string }

const idOf = (v: string | { _id: string } | undefined | null): string | undefined =>
  typeof v === 'string' ? v : v?._id;

const reportStatusToKey = (status: string): StatusKey => {
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'SUBMITTED';
  return 'IN_PROGRESS'; // DRAFT / ON_HOLD
};

export const StageTimeline = ({ title = 'Production Timeline', defaultProductId }: StageTimelineProps) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [productId, setProductId] = useState(defaultProductId || '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const orgQs = user?.organization ? `?organization=${user.organization}` : '';
        const [prodRes, planRes, reportRes] = await Promise.all([
          api.getList<ApiProduct>(`/admin/products${orgQs}`),
          api.getList<ApiPlan>(`/inspection-plans${orgQs}`),
          api.getList<ApiReport>(`/inspection-reports${orgQs}`),
        ]);
        if (cancelled) return;
        setProducts(prodRes.data);
        setPlans(planRes.data);
        setReports(reportRes.data);
      } catch {
        if (!cancelled) { setProducts([]); setPlans([]); setReports([]); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organization]);

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0]._id);
  }, [products, productId]);

  const product = products.find((p) => p._id === productId);
  const mfg = useMemo(() => [...(product?.manufacturingStages || [])].sort((a, b) => a.sequence - b.sequence), [product]);
  const asm = useMemo(() => [...(product?.assemblyStages || [])].sort((a, b) => a.sequence - b.sequence), [product]);

  // A stage's status is derived from the most recent inspection report against a plan
  // for this product + stage (there's no separate per-stage status field on the backend).
  const stageInfo = (stageId: string, stageField: 'manufacturingStage' | 'assemblyStage'): { status: StatusKey; date?: string } => {
    const planIds = plans
      .filter((p) => idOf(p.product) === productId && idOf(p[stageField]) === stageId)
      .map((p) => p._id);
    const matches = reports
      .filter((r) => planIds.includes(idOf(r.plan) || ''))
      .sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));
    if (matches.length === 0) return { status: 'NOT_STARTED' };
    return { status: reportStatusToKey(matches[0].status), date: matches[0].inspectionDate };
  };

  const renderRow = (stages: ApiStage[], label: string, color: string, stageField: 'manufacturingStage' | 'assemblyStage') => (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
        <Badge variant="outline" className="border-border">{stages.length} stage{stages.length === 1 ? '' : 's'}</Badge>
      </div>
      {stages.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">No stages assigned for this product</p>
      ) : (
        <div className="relative px-2">
          <div className={cn('absolute top-5 left-8 right-8 h-1 rounded-full', color)} />
          <div className="relative flex flex-wrap justify-between gap-y-6 pb-2">
            {stages.map((s, i) => {
              const { status, date } = stageInfo(s._id, stageField);
              const cfg = STATUS_STYLE[status];
              const Icon = cfg.Icon;
              return (
                <motion.div
                  key={s._id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.25 }}
                  className="flex flex-col items-center min-w-[110px] flex-1 group cursor-pointer"
                  title={`${s.name} — ${cfg.label}${date ? ` (${formatDate(date)})` : ''}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.96 }}
                    className={cn('relative z-10 flex h-11 w-11 items-center justify-center rounded-full ring-4 transition-shadow shadow-md', cfg.cls, cfg.ring)}
                  >
                    <Icon className="h-5 w-5" />
                    {status === 'SUBMITTED' && (
                      <motion.div animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 rounded-full bg-amber-500" />
                    )}
                    {status === 'IN_PROGRESS' && (
                      <motion.div animate={{ scale: [1, 1.25, 1], opacity: [0.45, 0, 0.45] }} transition={{ repeat: Infinity, duration: 2.2 }} className="absolute inset-0 rounded-full bg-accent" />
                    )}
                  </motion.div>
                  <p className="text-xs font-semibold mt-2.5 text-center px-1 text-foreground" title={s.name}>{s.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.label}</p>
                  {date && <p className="text-[9px] text-muted-foreground/80 mt-0.5">{formatDate(date)}</p>}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3 flex-wrap">
        <div>
          <CardTitle>{title}</CardTitle>
          {product && <p className="text-xs text-muted-foreground mt-1">{product.name} · {product.productId}</p>}
        </div>
        <Select value={productId} onChange={setProductId} options={products.map((p) => ({ label: p.name, value: p._id }))} className="w-56" />
      </CardHeader>
      <CardContent>
        {!product ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{products.length === 0 ? 'No products yet.' : 'Select a product to view its production timeline.'}</p>
        ) : (
          <>
            {renderRow(mfg, 'Manufacturing Stages', 'bg-gradient-to-r from-accent/30 via-accent/70 to-accent/30', 'manufacturingStage')}
            {renderRow(asm, 'Assembling Stages',    'bg-gradient-to-r from-primary/30 via-primary/70 to-primary/30', 'assemblyStage')}

            <div className="flex items-center gap-4 mt-6 pt-4 border-t flex-wrap">
              {(Object.keys(STATUS_STYLE) as StatusKey[]).map((k) => {
                const cfg = STATUS_STYLE[k];
                return (
                  <div key={k} className="flex items-center gap-1.5 text-xs">
                    <div className={cn('h-3 w-3 rounded-full', cfg.cls)} />
                    <span className="text-muted-foreground">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
