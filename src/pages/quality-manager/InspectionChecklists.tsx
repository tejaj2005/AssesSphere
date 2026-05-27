import { useState, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Trash2, Pencil, MoreHorizontal, Eye, FileEdit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { ExportButtons } from '@/components/dashboard/ExportButtons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { cn, formatDate } from '@/lib/utils';
import type { InspectionChecklist, ChecklistType, ChecklistItem } from '@/types';

interface NewItem { id: string; item: string }

const SortableItem = ({ item, onChange, onRemove }: { item: NewItem; onChange: (v: string) => void; onRemove: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={cn('flex items-start gap-2 p-2 rounded-md border bg-card', isDragging && 'shadow-lg')}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground p-1 mt-1"><GripVertical className="h-3.5 w-3.5" /></button>
      <Textarea value={item.item} onChange={(e) => onChange(e.target.value)} rows={1} placeholder="Inspection item description" />
      <button onClick={onRemove} className="text-destructive p-1 mt-1"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
};

export const InspectionChecklists = () => {
  const { checklists, products, addChecklist, deleteChecklist } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState<ChecklistType>('MANUFACTURING');
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState<InspectionChecklist | null>(null);
  const [confirmDel, setConfirmDel] = useState<InspectionChecklist | null>(null);
  const [productId, setProductId] = useState('');
  const [items, setItems] = useState<NewItem[]>([{ id: `i-${Math.random().toString(36).slice(2, 8)}`, item: '' }]);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => checklists.filter((c) => c.type === tab), [checklists, tab]);

  const handleDrag = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((x) => x.id === active.id);
    const newIdx = items.findIndex((x) => x.id === over.id);
    setItems(arrayMove(items, oldIdx, newIdx));
  };

  const save = async (status: 'DRAFT' | 'ACTIVE') => {
    if (!productId) { toast.error('Product required'); return; }
    const valid = items.filter((i) => i.item.trim());
    if (valid.length === 0) { toast.error('Add at least 1 item'); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    const prod = products.find((p) => p.id === productId)!;
    const finalItems: ChecklistItem[] = valid.map((it, idx) => ({ id: it.id, slNo: idx + 1, item: it.item.trim(), observation: 'PENDING' as const }));
    addChecklist({ type: tab, productId: prod.id, productName: prod.name, items: finalItems, status, createdBy: user?.name || 'QM' });
    toast.success(status === 'DRAFT' ? 'Checklist saved as draft' : 'Checklist activated');
    setBusy(false); setDrawer(false);
    setItems([{ id: `i-${Math.random().toString(36).slice(2, 8)}`, item: '' }]); setProductId('');
  };

  const loadTemplate = () => {
    const tpl = checklists.filter((c) => c.type === tab).slice(0, 1)[0];
    if (!tpl) { toast.message('No template available'); return; }
    setItems(tpl.items.map((it) => ({ id: `i-${Math.random().toString(36).slice(2, 8)}`, item: it.item })));
    toast.success('Template loaded');
  };

  const exportRows = filtered.map((c) => ({ Code: c.checklistCode, Type: c.type, Product: c.productName, Items: c.items.length, Status: c.status, Created: formatDate(c.createdAt) }));

  const columns: Column<InspectionChecklist>[] = [
    { key: 'code', header: 'Code', cell: (c) => <span className="font-mono text-xs font-medium">{c.checklistCode}</span> },
    { key: 'prod', header: 'Product', cell: (c) => <span className="font-medium text-sm">{c.productName}</span> },
    { key: 'items', header: 'Items', cell: (c) => <Badge variant="outline">{c.items.length}</Badge> },
    { key: 'pass', header: 'Pass', cell: (c) => <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{c.items.filter((i) => i.observation === 'PASS').length}</span> },
    { key: 'fail', header: 'Fail', cell: (c) => <span className="text-xs text-red-700 dark:text-red-400 font-medium">{c.items.filter((i) => i.observation === 'FAIL').length}</span> },
    { key: 'status', header: 'Status', cell: (c) => <Badge variant={c.status === 'COMPLETED' ? 'success' : c.status === 'ACTIVE' ? 'accent' : 'slate'}>{c.status}</Badge> },
    { key: 'actions', header: '', width: 'w-12', cell: (c) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => setDetail(c)}><Eye className="h-4 w-4" /> View</DropdownItem>
          <DropdownItem onClick={() => { setItems(c.items.map((it) => ({ id: it.id, item: it.item }))); setProductId(c.productId); setDrawer(true); }}><FileEdit className="h-4 w-4" /> Use as Template</DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onClick={() => setConfirmDel(c)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
        </Dropdown>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader title="Inspection Checklists" description="Build reusable checklists for inspections." action={
        <>
          <ExportButtons data={exportRows} fileName="checklists" />
          <Button variant="accent" onClick={() => setDrawer(true)}><Plus className="h-4 w-4" /> Create Checklist</Button>
        </>
      } />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ChecklistType)} className="mb-4">
        <TabsList>
          <TabsTrigger value="MANUFACTURING">Manufacturing ({checklists.filter((c) => c.type === 'MANUFACTURING').length})</TabsTrigger>
          <TabsTrigger value="ASSEMBLING">Assembling ({checklists.filter((c) => c.type === 'ASSEMBLING').length})</TabsTrigger>
          <TabsTrigger value="FINAL_PRODUCT">Final Product ({checklists.filter((c) => c.type === 'FINAL_PRODUCT').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable columns={columns} data={filtered} onRowClick={(c) => setDetail(c)} emptyTitle="No checklists" />

      <Sheet open={drawer} onOpenChange={busy ? () => {} : setDrawer} className="!w-[600px]">
        <SheetHeader>
          <SheetTitle>Create {tab.replace('_', ' ')} Checklist</SheetTitle>
          <SheetDescription>Add items, drag to reorder. Min 1 item.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Product</Label>
                <Select value={productId} onChange={setProductId} options={products.map((p) => ({ label: p.name, value: p.id }))} placeholder="Select product" />
              </div>
              <div className="space-y-1.5"><Label>Type</Label><Input value={tab.replace('_', ' ')} disabled /></div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <Label>Items</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={loadTemplate}>Load Template</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, { id: `i-${Math.random().toString(36).slice(2, 8)}`, item: '' }])}><Plus className="h-3.5 w-3.5" /> Add Item</Button>
              </div>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDrag}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((it) => (
                    <SortableItem key={it.id} item={it} onChange={(v) => setItems(items.map((x) => x.id === it.id ? { ...x, item: v } : x))} onRemove={() => setItems(items.filter((x) => x.id !== it.id))} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setDrawer(false)} disabled={busy}>Cancel</Button>
          <Button variant="outline" onClick={() => save('DRAFT')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Draft</Button>
          <Button variant="accent" onClick={() => save('ACTIVE')} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Activate</Button>
        </SheetFooter>
      </Sheet>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[560px]">
        {detail && (
          <>
            <SheetHeader><SheetTitle>{detail.checklistCode}</SheetTitle><SheetDescription>{detail.productName} · {detail.items.length} items · {detail.status}</SheetDescription></SheetHeader>
            <SheetBody>
              <ol className="space-y-2">
                {detail.items.map((it) => {
                  const map = { PASS: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400', label: 'Pass' }, FAIL: { cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400', label: 'Fail' }, NOTE: { cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400', label: 'Note' }, PENDING: { cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400', label: 'Pending' } }[it.observation];
                  return (
                    <li key={it.id} className="p-3 rounded-lg border flex items-start gap-3">
                      <span className="text-xs font-mono text-muted-foreground mt-0.5">{it.slNo}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{it.item}</p>
                        {it.note && <p className="text-xs text-muted-foreground mt-1 italic">"{it.note}"</p>}
                        {it.performedBy && <p className="text-[10px] text-muted-foreground mt-0.5">By {it.performedBy} on {formatDate(it.performedDate!)}</p>}
                      </div>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium', map.cls)}>{map.label}</span>
                    </li>
                  );
                })}
              </ol>
            </SheetBody>
          </>
        )}
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.checklistCode} onConfirm={() => { if (confirmDel) { deleteChecklist(confirmDel.id); toast.success('Deleted'); setConfirmDel(null); } }} />
    </PageWrapper>
  );
};
