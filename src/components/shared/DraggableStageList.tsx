import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FormDrawer } from './FormDrawer';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stage { id: string; name: string; order: number }

interface DraggableStageListProps {
  stages: Stage[];
  countFn: (id: string) => number;
  countLabel: string;
  onAdd: (data: { name: string }) => { success: boolean; error?: string };
  onUpdate: (id: string, data: { name: string }) => { success: boolean; error?: string };
  onDelete: (id: string) => { success: boolean; error?: string };
  onReorder: (ids: string[]) => void;
  entityLabel: string;
}

const SortableRow = ({ s, count, countLabel, onEdit, onDelete }: { s: Stage; count: number; countLabel: string; onEdit: () => void; onDelete: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={cn('flex items-center gap-3 p-4 border-b last:border-b-0', isDragging && 'bg-accent/5')}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-semibold shrink-0">{s.order}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{s.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{s.id}</p>
      </div>
      <Badge variant="outline">{count} {countLabel}</Badge>
      <div className="flex gap-1 ml-2">
        <Button variant="ghost" size="icon-sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
      </div>
    </div>
  );
};

export const DraggableStageList = ({ stages, countFn, countLabel, onAdd, onUpdate, onDelete, onReorder, entityLabel }: DraggableStageListProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Stage | null>(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState<Stage | null>(null);

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

  const openAdd = () => { setEditing(null); setName(''); setErr(''); setDrawerOpen(true); };
  const openEdit = (s: Stage) => { setEditing(s); setName(s.name); setErr(''); setDrawerOpen(true); };

  const submit = async () => {
    if (!name.trim()) { setErr('Name is required'); return; }
    const res = editing ? onUpdate(editing.id, { name: name.trim() }) : onAdd({ name: name.trim() });
    if (!res.success) { setErr(res.error || 'Failed'); toast.error(res.error); return; }
    toast.success(editing ? 'Stage updated' : 'Stage added');
    setDrawerOpen(false);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Stage</Button>
      </div>
      {sorted.length === 0 ? (
        <Card className="p-12">
          <EmptyState icon={Settings} title="No stages" description="Add your first stage." action={<Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Stage</Button>} />
        </Card>
      ) : (
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
      )}

      <FormDrawer
        open={drawerOpen} onOpenChange={setDrawerOpen}
        title={editing ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Add'}
      >
        <div className="space-y-1.5">
          <Label>Stage Name <span className="text-destructive">*</span></Label>
          <Input value={name} error={!!err} onChange={(e) => { setName(e.target.value); setErr(''); }} autoFocus />
          {err && <p className="text-xs text-destructive">{err}</p>}
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
