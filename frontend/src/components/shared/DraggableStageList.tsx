import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Plus, Settings, Clock, Timer, MapPin, ShieldCheck, ListOrdered, Move, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormDrawer } from './FormDrawer';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { cn, formatDate } from '@/lib/utils';
import type { ProcessStage, StageStatus } from '@/types';

type StageFormData = {
  name: string;
  description?: string;
  workCenter?: string;
  standardTimeMin?: number;
  setupTimeMin?: number;
  criticalToQuality?: boolean;
  status?: StageStatus;
};

interface DraggableStageListProps {
  stages: ProcessStage[];
  countFn: (id: string) => number;
  countLabel: string;
  onAdd: (data: StageFormData) => { success: boolean; error?: string };
  onUpdate: (id: string, data: StageFormData) => { success: boolean; error?: string };
  onDelete: (id: string) => { success: boolean; error?: string };
  onReorder: (ids: string[]) => void;
  entityLabel: string;
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const StageMeta = ({ s }: { s: ProcessStage }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
    {s.workCenter && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.workCenter}</span>}
    {s.standardTimeMin != null && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {s.standardTimeMin}m std</span>}
    {s.setupTimeMin != null && <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> {s.setupTimeMin}m setup</span>}
    {s.updatedAt && <span className="inline-flex items-center gap-1" title="Last updated">Updated {formatDate(s.updatedAt)}</span>}
  </div>
);

const SortableRow = ({ s, count, countLabel, onEdit, onDelete }: { s: ProcessStage; count: number; countLabel: string; onEdit: () => void; onDelete: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={cn('flex items-start gap-3 p-4 border-b last:border-b-0', isDragging && 'bg-accent/5')}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 mt-0.5">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-semibold shrink-0 mt-0.5">{s.order}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">{s.name}</p>
          {s.criticalToQuality && <Badge variant="warning" className="text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> CTQ</Badge>}
          {s.status === 'INACTIVE' && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
        </div>
        <p className="text-xs text-muted-foreground font-mono">{s.id}</p>
        {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.description}</p>}
        <StageMeta s={s} />
      </div>
      <Badge variant="outline" className="mt-0.5">{count} {countLabel}</Badge>
      <div className="flex gap-1 ml-2 mt-0.5">
        <Button variant="ghost" size="icon-sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
      </div>
    </div>
  );
};

const EMPTY_FORM: StageFormData = { name: '', description: '', workCenter: '', standardTimeMin: undefined, setupTimeMin: undefined, criticalToQuality: false, status: 'ACTIVE' };

export const DraggableStageList = ({ stages, countFn, countLabel, onAdd, onUpdate, onDelete, onReorder, entityLabel }: DraggableStageListProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessStage | null>(null);
  const [form, setForm] = useState<StageFormData>(EMPTY_FORM);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState<ProcessStage | null>(null);
  const [mode, setMode] = useState<'reorder' | 'sequence'>('reorder');
  const [picks, setPicks] = useState<string[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const sorted = [...stages].sort((a, b) => a.order - b.order);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((s) => s.id === active.id);
    const newIndex = sorted.findIndex((s) => s.id === over.id);
    const newOrder = arrayMove(sorted, oldIndex, newIndex).map((s) => s.id);
    onReorder(newOrder);
    toast.success('Order updated');
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setErr(''); setDrawerOpen(true); };
  const openEdit = (s: ProcessStage) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description || '', workCenter: s.workCenter || '', standardTimeMin: s.standardTimeMin, setupTimeMin: s.setupTimeMin, criticalToQuality: !!s.criticalToQuality, status: s.status || 'ACTIVE' });
    setErr('');
    setDrawerOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) { setErr('Name is required'); return; }
    const payload: StageFormData = { ...form, name: form.name.trim(), description: form.description?.trim() || undefined, workCenter: form.workCenter?.trim() || undefined };
    const res = editing ? onUpdate(editing.id, payload) : onAdd(payload);
    if (!res.success) { setErr(res.error || 'Failed'); toast.error(res.error); return; }
    toast.success(editing ? 'Stage updated' : 'Stage added');
    setDrawerOpen(false);
  };

  // Click-to-sequence: clicking stages assigns ordinals by click order.
  const togglePick = (id: string) => setPicks((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const setManualPosition = (id: string, posStr: string) => {
    const pos = parseInt(posStr, 10);
    setPicks((prev) => {
      const without = prev.filter((x) => x !== id);
      if (isNaN(pos) || pos < 1) return without; // clearing the number removes from the sequence
      const idx = Math.min(pos - 1, without.length);
      without.splice(idx, 0, id);
      return without;
    });
  };

  const applySequence = () => {
    if (picks.length === 0) { toast.error('Click stages in order to build a sequence first'); return; }
    const remaining = sorted.filter((s) => !picks.includes(s.id)).map((s) => s.id);
    onReorder([...picks, ...remaining]);
    setPicks([]);
    setMode('reorder');
    toast.success(`Sequence applied — ${picks.length} stage${picks.length !== 1 ? 's' : ''} reordered`);
  };

  const numInput = (v: number | undefined, set: (n: number | undefined) => void, placeholder: string) => (
    <Input type="number" min={0} value={v ?? ''} placeholder={placeholder} onChange={(e) => set(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))} />
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-lg border p-0.5 bg-card">
          <button onClick={() => { setMode('reorder'); setPicks([]); }} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors', mode === 'reorder' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <Move className="h-4 w-4" /> Drag to reorder
          </button>
          <button onClick={() => setMode('sequence')} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors', mode === 'sequence' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <ListOrdered className="h-4 w-4" /> Click to sequence
          </button>
        </div>
        <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Stage</Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-12">
          <EmptyState icon={Settings} title="No stages" description="Add your first stage." action={<Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Stage</Button>} />
        </Card>
      ) : mode === 'reorder' ? (
        <Card className="overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <AnimatePresence>
                {sorted.map((s) => (
                  <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} layout>
                    <SortableRow s={s} count={countFn(s.id)} countLabel={countLabel} onEdit={() => openEdit(s)} onDelete={() => setConfirmDel(s)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Click stages in the order they should run — each click assigns the next step number. Click again to remove, or type a position to adjust it manually.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="accent">{picks.length} of {sorted.length} sequenced</Badge>
              <Button size="sm" variant="ghost" onClick={() => setPicks([])} disabled={picks.length === 0}><RotateCcw className="h-3.5 w-3.5" /> Reset</Button>
              <Button size="sm" variant="accent" onClick={applySequence} disabled={picks.length === 0}><Check className="h-3.5 w-3.5" /> Apply Sequence</Button>
            </div>
          </div>
          {sorted.map((s) => {
            const pickIndex = picks.indexOf(s.id);
            const picked = pickIndex !== -1;
            return (
              <div key={s.id} className={cn('flex items-center gap-3 p-4 border-b last:border-b-0 transition-colors', picked && 'bg-accent/5')}>
                <button
                  type="button"
                  onClick={() => togglePick(s.id)}
                  className={cn('flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold shrink-0 transition-colors',
                    picked ? 'bg-accent border-accent text-accent-foreground' : 'border-dashed border-muted-foreground/40 text-muted-foreground hover:border-accent hover:text-accent')}
                  title={picked ? 'Click to remove from sequence' : 'Click to add as next step'}
                >
                  {picked ? pickIndex + 1 : '+'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{s.name}</p>
                    {picked && <Badge variant="accent" className="text-[10px]">{ordinal(pickIndex + 1)} stage</Badge>}
                    {s.criticalToQuality && <Badge variant="warning" className="text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> CTQ</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{s.id}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Step</Label>
                  <Input
                    type="number"
                    min={1}
                    max={sorted.length}
                    value={picked ? pickIndex + 1 : ''}
                    placeholder="—"
                    onChange={(e) => setManualPosition(s.id, e.target.value)}
                    className="w-16 text-center"
                  />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <FormDrawer
        open={drawerOpen} onOpenChange={setDrawerOpen}
        title={editing ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
        description={editing ? 'Update the stage definition, standard times and method.' : 'Define the stage with its work centre, standard times and method.'}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Add'}
      >
        <div className="space-y-1.5">
          <Label>Stage Name <span className="text-destructive">*</span></Label>
          <Input value={form.name} error={!!err} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErr(''); }} autoFocus placeholder="e.g. Heat Treatment" />
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Work Centre / Department</Label>
          <Input value={form.workCenter || ''} onChange={(e) => setForm({ ...form, workCenter: e.target.value })} placeholder="e.g. Machine Shop" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Standard Time (min) <span className="text-[10px] text-muted-foreground font-normal">· time study</span></Label>
            {numInput(form.standardTimeMin, (n) => setForm({ ...form, standardTimeMin: n }), 'Cycle time / unit')}
          </div>
          <div className="space-y-1.5">
            <Label>Setup Time (min) <span className="text-[10px] text-muted-foreground font-normal">· motion study</span></Label>
            {numInput(form.setupTimeMin, (n) => setForm({ ...form, setupTimeMin: n }), 'Changeover time')}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Method / Work Instruction <span className="text-[10px] text-muted-foreground font-normal">· methods study</span></Label>
          <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Document how this stage is performed (SOP summary)…" />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="cursor-pointer">Critical to Quality (CTQ)</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Flag this stage as a quality control point.</p>
          </div>
          <Switch checked={!!form.criticalToQuality} onCheckedChange={(c) => setForm({ ...form, criticalToQuality: c })} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="cursor-pointer">Active</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Inactive stages cannot be assigned to new products.</p>
          </div>
          <Switch checked={form.status !== 'INACTIVE'} onCheckedChange={(c) => setForm({ ...form, status: c ? 'ACTIVE' : 'INACTIVE' })} />
        </div>
      </FormDrawer>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        entityName={confirmDel?.name}
        onConfirm={() => { if (confirmDel) { const r = onDelete(confirmDel.id); if (!r.success) toast.error(r.error); else { toast.success('Stage deleted'); setConfirmDel(null); } } }}
      />
    </>
  );
};
