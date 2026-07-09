import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { ConfigForm, validateConfigForm, FieldDef } from '@/components/shared/ConfigForm';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';

/** Backend Equipment model (server/models/Equipment.ts). Note this diverges from the
 * old mock InspectionEquipment shape — there's no assetTag/departmentId/condition/
 * inspectionTypeIds/manuals/notes/purchaseDate column, so the form below is defined
 * locally (instead of reusing the shared `equipmentFields` helper) to only show fields
 * that actually persist. */
interface EquipmentDoc {
  _id: string;
  id: string;
  name: string;
  equipmentId: string;
  type: string;
  modelNumber?: string;
  serialNumber?: string;
  vendorName?: string;
  calibrationStatus: 'COMPLETED' | 'PENDING' | 'OVERDUE' | 'NOT_REQUIRED';
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  calibrationFrequencyDays?: number;
  location?: string;
  isActive?: boolean;
  organization?: string;
}

const FREQUENCY_OPTIONS = [
  { label: 'Monthly', value: '30' },
  { label: 'Quarterly', value: '90' },
  { label: 'Bi-annually', value: '180' },
  { label: 'Annually', value: '365' },
];

const fields: FieldDef[] = [
  { section: 'Identity', name: 'name', label: 'Equipment Name', type: 'text', required: true, col: 'half' },
  { name: 'equipmentId', label: 'Equipment Code', type: 'text', col: 'half', placeholder: 'Auto-generated if left blank' },
  { name: 'type', label: 'Equipment Type', type: 'select', required: true, col: 'half',
    options: [{ label: 'Measuring', value: 'MEASURING' }, { label: 'Production', value: 'PRODUCTION' }, { label: 'Testing', value: 'TESTING' }, { label: 'Calibration', value: 'CALIBRATION' }] },
  { name: 'location', label: 'Location', type: 'text', col: 'half' },

  { section: 'Vendor', name: 'vendorName', label: 'Manufacturer / Supplier', type: 'text', required: true, col: 'half' },
  { name: 'modelNumber', label: 'Model Number', type: 'text', col: 'half' },
  { name: 'serialNumber', label: 'Serial Number', type: 'text', col: 'half' },

  { section: 'Calibration', name: 'nextCalibrationDate', label: 'Calibration Due Date', type: 'date', required: true, col: 'half' },
  { name: 'calibrationFrequencyDays', label: 'Calibration Frequency', type: 'select', col: 'half', options: FREQUENCY_OPTIONS },
  { name: 'calibrationStatus', label: 'Calibration Status', type: 'select', col: 'half',
    options: [{ label: 'Completed', value: 'COMPLETED' }, { label: 'Pending', value: 'PENDING' }] },
];

const emptyForm: any = {
  name: '', equipmentId: '', type: 'MEASURING', location: '',
  vendorName: '', modelNumber: '', serialNumber: '',
  nextCalibrationDate: new Date().toISOString().slice(0, 10),
  calibrationFrequencyDays: '365', calibrationStatus: 'COMPLETED',
};

export const EquipmentPage = () => {
  const { user } = useAuth();
  const { items: equipment, loading, create, update, remove } = useApiResource<EquipmentDoc>('/admin/equipment');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<EquipmentDoc | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<EquipmentDoc | null>(null);

  const filtered = useMemo(() => equipment.filter((e) => {
    if (search && !(e.name.toLowerCase().includes(search.toLowerCase()) || (e.equipmentId || '').toLowerCase().includes(search.toLowerCase()) || (e.vendorName || '').toLowerCase().includes(search.toLowerCase()))) return false;
    if (statusFilter !== 'all' && e.calibrationStatus !== statusFilter) return false;
    return true;
  }), [equipment, search, statusFilter]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrs({}); setDrawer(true); };
  const openEdit = (e: EquipmentDoc) => {
    setEditing(e);
    setForm({
      ...emptyForm,
      ...e,
      nextCalibrationDate: e.nextCalibrationDate ? e.nextCalibrationDate.slice(0, 10) : '',
      calibrationFrequencyDays: e.calibrationFrequencyDays ? String(e.calibrationFrequencyDays) : '365',
    });
    setErrs({});
    setDrawer(true);
  };

  const submit = async () => {
    const v = validateConfigForm(fields, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix errors'); return; }
    setErrs({});
    const payload: Record<string, any> = {
      name: form.name.trim(),
      type: form.type,
      vendorName: form.vendorName?.trim(),
      modelNumber: form.modelNumber?.trim() || undefined,
      serialNumber: form.serialNumber?.trim() || undefined,
      location: form.location?.trim() || undefined,
      nextCalibrationDate: form.nextCalibrationDate,
      calibrationFrequencyDays: form.calibrationFrequencyDays ? Number(form.calibrationFrequencyDays) : 365,
      calibrationStatus: form.calibrationStatus,
    };
    if (form.equipmentId?.trim()) payload.equipmentId = form.equipmentId.trim();
    try {
      if (editing) {
        await update(editing.id, payload as any);
        toast.success('Equipment updated');
      } else {
        await create({ ...payload, organization: user?.organization } as any);
        toast.success('Equipment added');
      }
      setDrawer(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const isSoon = (d?: string) => { if (!d) return false; const days = differenceInDays(new Date(d), new Date()); return days >= 0 && days <= 7; };

  const columns: Column<EquipmentDoc>[] = [
    { key: 'name', header: 'Equipment', sortable: true, sortValue: (e) => e.name, cell: (e) => <span className="font-medium">{e.name}</span> },
    { key: 'equipmentId', header: 'Code', cell: (e) => <span className="text-xs font-mono text-muted-foreground">{e.equipmentId}</span> },
    { key: 'vendorName', header: 'Supplier', sortable: true, sortValue: (e) => e.vendorName || '', cell: (e) => e.vendorName || '—' },
    { key: 'status', header: 'Calibration', cell: (e) => <StatusBadge status={e.calibrationStatus} pulse /> },
    { key: 'due', header: 'Due Date', sortable: true, sortValue: (e) => e.nextCalibrationDate || '', cell: (e) => (
      <div className="flex items-center gap-1.5">
        <span className={isSoon(e.nextCalibrationDate) ? 'text-warning font-medium' : ''}>{e.nextCalibrationDate ? formatDate(e.nextCalibrationDate) : '—'}</span>
        {isSoon(e.nextCalibrationDate) && <Tooltip content="Calibration due soon"><AlertTriangle className="h-3.5 w-3.5 text-warning" /></Tooltip>}
      </div>
    ) },
    { key: 'actions', header: '', width: 'w-12', cell: (e) => (
      <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
        <DropdownItem onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
        <DropdownItem danger onClick={() => setConfirmDel(e)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
      </Dropdown>
    ) },
  ];

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader
        title="Equipment & Calibration"
        description="Track inspection equipment and calibration schedules."
        action={
          <>
            <DataToolbar data={equipment.map((e) => ({ Name: e.name, Code: e.equipmentId, Supplier: e.vendorName || '', Status: e.calibrationStatus, DueDate: e.nextCalibrationDate || '' }))} filename="pqas-equipment" />
            <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Equipment</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="sm:w-72" />
        <Select value={statusFilter} onChange={setStatusFilter} options={[{ label: 'All Status', value: 'all' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Pending', value: 'PENDING' }, { label: 'Overdue', value: 'OVERDUE' }]} className="sm:w-44" />
      </div>
      <DataTable columns={columns} data={filtered} emptyTitle="No equipment" rowClassName={(e) => e.calibrationStatus === 'PENDING' ? 'border-l-4 border-l-warning' : e.calibrationStatus === 'OVERDUE' ? 'border-l-4 border-l-destructive' : ''} />

      <FormDrawer open={drawer} onOpenChange={setDrawer} title={editing ? 'Edit Equipment' : 'Add Equipment'} onSubmit={submit} submitLabel={editing ? 'Update' : 'Create'}>
        <ConfigForm fields={fields} value={form} onChange={setForm} errors={errs} />
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={async () => {
          if (!confirmDel) return;
          try {
            await remove(confirmDel.id);
            toast.success('Deleted');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Something went wrong');
          } finally {
            setConfirmDel(null);
          }
        }} />
    </PageWrapper>
  );
};
