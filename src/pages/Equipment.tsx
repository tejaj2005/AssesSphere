import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { useData } from '@/context/DataContext';
import { nextId, formatDate } from '@/lib/utils';
import type { InspectionEquipment, CalibrationStatus } from '@/types';

export const EquipmentPage = () => {
  const { equipment, addEquipment, updateEquipment, deleteEquipment } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<InspectionEquipment | null>(null);
  const initialForm = { name: '', code: '', supplier: '', calibrationStatus: 'COMPLETED' as CalibrationStatus, calibrationDueDate: new Date().toISOString().slice(0, 10) };
  const [form, setForm] = useState(initialForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<InspectionEquipment | null>(null);

  const filtered = useMemo(() => equipment.filter((e) => {
    if (search && !(e.name.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase()) || e.supplier.toLowerCase().includes(search.toLowerCase()))) return false;
    if (statusFilter !== 'all' && e.calibrationStatus !== statusFilter) return false;
    return true;
  }), [equipment, search, statusFilter]);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm, code: nextId('EQP', equipment) }); setErrs({}); setDrawer(true); };
  const openEdit = (e: InspectionEquipment) => { setEditing(e); setForm({ name: e.name, code: e.code, supplier: e.supplier, calibrationStatus: e.calibrationStatus, calibrationDueDate: e.calibrationDueDate }); setErrs({}); setDrawer(true); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.code.trim()) e.code = 'Required';
    if (!form.supplier.trim()) e.supplier = 'Required';
    if (!form.calibrationDueDate) e.calibrationDueDate = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    const res = editing ? updateEquipment(editing.id, form) : addEquipment(form);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(editing ? 'Equipment updated' : 'Equipment added');
    setDrawer(false);
  };

  const isSoon = (d: string) => { const days = differenceInDays(new Date(d), new Date()); return days >= 0 && days <= 7; };

  const columns: Column<InspectionEquipment>[] = [
    { key: 'name', header: 'Equipment', sortable: true, sortValue: (e) => e.name, cell: (e) => <span className="font-medium">{e.name}</span> },
    { key: 'code', header: 'Code', cell: (e) => <span className="text-xs font-mono text-muted-foreground">{e.code}</span> },
    { key: 'supplier', header: 'Supplier', sortable: true, sortValue: (e) => e.supplier, cell: (e) => e.supplier },
    { key: 'status', header: 'Calibration', cell: (e) => <StatusBadge status={e.calibrationStatus} pulse /> },
    { key: 'due', header: 'Due Date', sortable: true, sortValue: (e) => e.calibrationDueDate, cell: (e) => (
      <div className="flex items-center gap-1.5">
        <span className={isSoon(e.calibrationDueDate) ? 'text-warning font-medium' : ''}>{formatDate(e.calibrationDueDate)}</span>
        {isSoon(e.calibrationDueDate) && <Tooltip content="Calibration due soon"><AlertTriangle className="h-3.5 w-3.5 text-warning" /></Tooltip>}
      </div>
    ) },
    { key: 'actions', header: '', width: 'w-12', cell: (e) => (
      <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        <DropdownItem onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
        <DropdownItem danger onClick={() => setConfirmDel(e)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
      </Dropdown>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Equipment & Calibration"
        description="Track inspection equipment and calibration schedules."
        action={
          <>
            <DataToolbar data={equipment.map((e) => ({ Name: e.name, Code: e.code, Supplier: e.supplier, Status: e.calibrationStatus, DueDate: e.calibrationDueDate }))} filename="pqas-equipment" />
            <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Equipment</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <Select value={statusFilter} onChange={setStatusFilter} options={[{ label: 'All Status', value: 'all' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Pending', value: 'PENDING' }]} className="sm:w-44" />
      </div>
      <DataTable columns={columns} data={filtered} emptyTitle="No equipment" rowClassName={(e) => e.calibrationStatus === 'PENDING' ? 'border-l-4 border-l-warning' : ''} />

      <FormDrawer open={drawer} onOpenChange={setDrawer} title={editing ? 'Edit Equipment' : 'Add Equipment'} onSubmit={submit} submitLabel={editing ? 'Update' : 'Create'}>
        <div className="space-y-1.5"><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} error={!!errs.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrs({ ...errs, name: '' }); }} />{errs.name && <p className="text-xs text-destructive">{errs.name}</p>}</div>
        <div className="space-y-1.5"><Label>Code <span className="text-destructive">*</span></Label><Input value={form.code} error={!!errs.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setErrs({ ...errs, code: '' }); }} />{errs.code && <p className="text-xs text-destructive">{errs.code}</p>}</div>
        <div className="space-y-1.5"><Label>Supplier <span className="text-destructive">*</span></Label><Input value={form.supplier} error={!!errs.supplier} onChange={(e) => { setForm({ ...form, supplier: e.target.value }); setErrs({ ...errs, supplier: '' }); }} />{errs.supplier && <p className="text-xs text-destructive">{errs.supplier}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Calibration Status</Label><Select value={form.calibrationStatus} onChange={(v) => setForm({ ...form, calibrationStatus: v as CalibrationStatus })} options={[{ label: 'Completed', value: 'COMPLETED' }, { label: 'Pending', value: 'PENDING' }]} /></div>
          <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.calibrationDueDate} onChange={(e) => setForm({ ...form, calibrationDueDate: e.target.value })} /></div>
        </div>
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={() => { if (confirmDel) { deleteEquipment(confirmDel.id); toast.success('Deleted'); setConfirmDel(null); } }} />
    </PageWrapper>
  );
};
