import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, Copy, Download, History, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ConfigForm, FieldDef, validateConfigForm } from '@/components/shared/ConfigForm';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate, nextId } from '@/lib/utils';
import type { Department } from '@/types';

export const DepartmentsPage = () => {
  const { departments, users, addDepartment, updateDepartment, deleteDepartment } = useData();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [detail, setDetail] = useState<Department | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<Department | null>(null);

  const canEdit = hasPermission('Departments', 'edit');
  const canDelete = hasPermission('Departments', 'delete');
  const canCreate = hasPermission('Departments', 'create');

  const DEPT_FIELDS: FieldDef[] = [
    { section: 'Identity', name: 'name', label: 'Department Name', type: 'text', required: true, col: 'half' },
    {                      name: 'code', label: 'Department Code', type: 'text', col: 'half', placeholder: 'e.g. DEPT-001' },
    {                      name: 'parentId', label: 'Parent Department', type: 'select', col: 'half',
                           options: [{ label: 'None (Top-level)', value: '' }, ...departments.filter((d) => d.id !== editing?.id).map((d) => ({ label: d.name, value: d.id }))] },
    {                      name: 'headId', label: 'Department Head', type: 'select', col: 'half', options: users.map((u) => ({ label: u.name, value: u.id })) },

    { section: 'Location & Contact', name: 'location', label: 'Location / Floor', type: 'text', col: 'half', placeholder: 'e.g. Floor 2, Building A' },
    {                                name: 'contactEmail', label: 'Contact Email', type: 'email', col: 'half' },
    {                                name: 'contactPhone', label: 'Contact Phone', type: 'tel', col: 'half' },
    {                                name: 'costCenter',  label: 'Cost Center Code', type: 'text', col: 'half', placeholder: 'e.g. CC-100' },

    { section: 'Budget & Description', name: 'budget', label: 'Budget Allocation (₹)', type: 'number', col: 'half' },
    {                                  name: 'status', label: 'Active', type: 'toggle', col: 'half' },
    {                                  name: 'description', label: 'Description', type: 'textarea' },
  ];

  const filtered = useMemo(() => departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())), [departments, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', code: nextId('DEPT', departments), parentId: '', headId: '', location: '', contactEmail: '', contactPhone: '', costCenter: '', budget: '', status: true, description: '' });
    setErrs({}); setDrawerOpen(true);
  };
  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ ...d, status: d.status === 'Active' });
    setErrs({}); setDrawerOpen(true);
  };

  const submit = () => {
    const v = validateConfigForm(DEPT_FIELDS, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix the errors'); return; }
    const payload: any = { ...form, status: form.status ? 'Active' : 'Inactive' };
    const res = editing ? updateDepartment(editing.id, payload) : addDepartment(payload);
    if (!res.success) { toast.error(res.error || 'Failed'); return; }
    toast.success(editing ? 'Department updated' : 'Department created');
    setDrawerOpen(false);
  };

  const toggleStatus = (d: Department) => {
    const next = d.status === 'Active' ? 'Inactive' : 'Active';
    updateDepartment(d.id, { status: next });
    toast.success(`${d.name} marked ${next}`);
  };

  const handleDelete = () => {
    if (!confirmDel) return;
    const res = deleteDepartment(confirmDel.id);
    if (!res.success) { toast.error(res.error || 'Failed'); return; }
    toast.success(`${confirmDel.name} deleted`);
    setConfirmDel(null);
  };

  const handleImport = (rows: Record<string, string>[]) => {
    let ok = 0;
    rows.forEach((r) => { const n = r.Department || r.Name || r.name; if (n) { const res = addDepartment({ name: n, status: 'Active' } as any); if (res.success) ok++; } });
    toast.success(`${ok} departments imported`);
  };

  const exportData = departments.map((d) => ({ Department: d.name, ID: d.id, Code: (d as any).code, Users: users.filter((u) => u.departmentId === d.id).length, Status: d.status, Created: d.createdAt }));

  const columns: Column<Department>[] = [
    { key: 'name',   header: 'Department', sortable: true, sortValue: (d) => d.name, cell: (d) => (
      <div><p className="font-medium text-sm text-[#0e5467] dark:text-foreground">{d.name}</p><p className="text-[10px] font-mono text-muted-foreground">{(d as any).code || d.id}</p></div>
    ) },
    { key: 'parent', header: 'Parent', cell: (d) => departments.find((x) => x.id === (d as any).parentId)?.name || <span className="text-xs text-muted-foreground italic">Top-level</span> },
    { key: 'head',   header: 'Head', cell: (d) => users.find((u) => u.id === (d as any).headId)?.name || <span className="text-xs text-muted-foreground italic">—</span> },
    { key: 'users',  header: 'Users', sortable: true, sortValue: (d) => users.filter((u) => u.departmentId === d.id).length, cell: (d) => { const c = users.filter((u) => u.departmentId === d.id).length; return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-xs font-medium tabular-nums">{c}</span>; } },
    { key: 'location', header: 'Location', cell: (d) => <span className="text-xs">{(d as any).location || '—'}</span> },
    { key: 'status', header: 'Status', cell: (d) => <button onClick={() => toggleStatus(d)}><StatusBadge status={d.status} /></button> },
    { key: 'actions', header: '', width: 'w-12', cell: (d) => (
      <ActionMenu actions={[
        { label: 'View Details', icon: Eye, onClick: () => setDetail(d) },
        { label: 'Edit', icon: Pencil, onClick: () => openEdit(d), show: canEdit },
        { label: 'Duplicate', icon: Copy, onClick: () => { const r = addDepartment({ name: `${d.name} (Copy)`, status: 'Active' } as any); if (r.success) toast.success('Duplicated'); }, show: canCreate },
        { label: 'Toggle Status', icon: ToggleLeft, onClick: () => toggleStatus(d), show: canEdit },
        { label: 'Copy ID', icon: Copy, onClick: () => { navigator.clipboard.writeText(d.id); toast.success('ID copied'); }, separatorBefore: true },
        { label: 'View History', icon: History, onClick: () => toast.message('Audit log opening…') },
        { label: 'Export', icon: Download, onClick: () => { const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${d.name}.json`; a.click(); URL.revokeObjectURL(url); toast.success('Exported'); } },
        { label: 'Delete', icon: Trash2, onClick: () => setConfirmDel(d), danger: true, show: canDelete, separatorBefore: true },
      ]} />
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader title="Departments" description="Manage organizational departments." action={
        <>
          <DataToolbar data={exportData} filename="pqas-departments" onImport={handleImport} />
          {canCreate && <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Department</Button>}
        </>
      } />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search departments…" className="sm:w-72" />
      </div>

      <DataTable columns={columns} data={filtered} emptyTitle="No departments"
        emptyDescription={search ? `No results for "${search}"` : 'Add your first department.'}
        emptyAction={canCreate && !search && <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Department</Button>} />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen} className="!w-[640px]">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit Department' : 'Add Department'}</SheetTitle>
          <SheetDescription>{editing ? 'Update department details.' : 'Create a new organizational department.'}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <ConfigForm fields={DEPT_FIELDS} value={form} onChange={setForm} errors={errs} />
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          <Button variant="accent" onClick={submit}>{editing ? 'Update' : 'Create'}</Button>
        </SheetFooter>
      </Sheet>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="!w-[560px]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.name}</SheetTitle>
              <SheetDescription>{(detail as any).code || detail.id}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Status', detail.status],
                  ['Parent', departments.find((x) => x.id === (detail as any).parentId)?.name || '—'],
                  ['Head', users.find((u) => u.id === (detail as any).headId)?.name || '—'],
                  ['Users', users.filter((u) => u.departmentId === detail.id).length],
                  ['Location', (detail as any).location || '—'],
                  ['Contact Email', (detail as any).contactEmail || '—'],
                  ['Contact Phone', (detail as any).contactPhone || '—'],
                  ['Cost Center', (detail as any).costCenter || '—'],
                  ['Budget', (detail as any).budget ? `₹ ${(detail as any).budget.toLocaleString()}` : '—'],
                  ['Created', formatDate(detail.createdAt)],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">{label}</dt>
                    <dd className="mt-1 text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
              {(detail as any).description && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-1">Description</dt>
                  <dd className="text-sm">{(detail as any).description}</dd>
                </div>
              )}
            </SheetBody>
          </>
        )}
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name} onConfirm={handleDelete} />
    </PageWrapper>
  );
};
