import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, Copy, Download, History, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ConfigForm, FieldDef, validateConfigForm } from '@/components/shared/ConfigForm';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AuditHistoryDialog } from '@/components/shared/AuditHistoryDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';

/** Backend Department (server/models/Department.ts) — much leaner than the old mock shape.
 * `head` comes back populated (a User object) on list/detail fetches. */
interface IDepartmentUser {
  _id: string;
  name: string;
  [key: string]: any;
}

interface IDepartment {
  _id: string;
  name: string;
  departmentId: string;
  organization: string;
  head?: IDepartmentUser | string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  [key: string]: any;
}

type Dept = IDepartment & { id: string };

export const DepartmentsPage = () => {
  const { user, hasPermission } = useAuth();
  const { items: departments, loading, create: addDepartment, update: updateDepartment, remove: deleteDepartment } =
    useApiResource<IDepartment>('/admin/departments');
  // Real Users, used for the "Department Head" picker and the per-department user count.
  // Note: User.department is a free-text string on the backend (not a Department ref), so the
  // count below is a best-effort match on department name rather than a real foreign key.
  const { items: users } = useApiResource<IDepartmentUser>(
    '/admin/users',
    user?.organization ? { organization: user.organization, limit: '1000' } : { limit: '1000' }
  );

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [detail, setDetail] = useState<Dept | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<Dept | null>(null);
  const [history, setHistory] = useState<Dept | null>(null);

  const canEdit = hasPermission('Departments', 'edit');
  const canDelete = hasPermission('Departments', 'delete');
  const canCreate = hasPermission('Departments', 'create');

  const headId = (d: Dept) => (typeof d.head === 'string' ? d.head : d.head?._id) || '';
  const headName = (d: Dept) => (typeof d.head === 'string' ? users.find((u) => u.id === d.head)?.name : d.head?.name) || null;
  const userCount = (d: Dept) => users.filter((u) => u.department === d.name).length;

  const DEPT_FIELDS: FieldDef[] = [
    { section: 'Identity', name: 'name', label: 'Department Name', type: 'text', required: true, col: 'half' },
    {                      name: 'code', label: 'Department Code', type: 'text', col: 'half', placeholder: 'e.g. DEPT-001 (auto if left blank)' },
    {                      name: 'headId', label: 'Department Head', type: 'select', col: 'half',
                           options: [{ label: 'None', value: '' }, ...users.map((u) => ({ label: u.name, value: u.id }))] },
    {                      name: 'status', label: 'Active', type: 'toggle', col: 'half' },

    { section: 'Description', name: 'description', label: 'Description', type: 'textarea' },
  ];

  const filtered = useMemo(() => departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())), [departments, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', code: '', headId: '', status: true, description: '' });
    setErrs({}); setDrawerOpen(true);
  };
  const openEdit = (d: Dept) => {
    setEditing(d);
    setForm({ name: d.name, code: d.departmentId, headId: headId(d), status: d.isActive, description: d.description || '' });
    setErrs({}); setDrawerOpen(true);
  };

  const submit = async () => {
    const v = validateConfigForm(DEPT_FIELDS, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix the errors'); return; }
    const payload: Record<string, any> = {
      name: form.name,
      departmentId: form.code || undefined,
      head: form.headId || undefined,
      description: form.description || undefined,
      isActive: !!form.status,
    };
    try {
      if (editing) {
        await updateDepartment(editing.id, payload);
        toast.success('Department updated');
      } else {
        await addDepartment({ ...payload, organization: user?.organization } as Partial<IDepartment>);
        toast.success('Department created');
      }
      setDrawerOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const toggleStatus = async (d: Dept) => {
    try {
      await updateDepartment(d.id, { isActive: !d.isActive });
      toast.success(`${d.name} marked ${d.isActive ? 'Inactive' : 'Active'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteDepartment(confirmDel.id);
      toast.success(`${confirmDel.name} deleted`);
      setConfirmDel(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const handleImport = async (rows: Record<string, string>[]) => {
    let ok = 0;
    for (const r of rows) {
      const n = r.Department || r.Name || r.name;
      if (!n) continue;
      try {
        await addDepartment({ name: n, isActive: true, organization: user?.organization } as Partial<IDepartment>);
        ok++;
      } catch { /* skip failed rows */ }
    }
    toast.success(`${ok} departments imported`);
  };

  const exportData = departments.map((d) => ({
    Department: d.name, ID: d.id, Code: d.departmentId, Users: userCount(d),
    Status: d.isActive ? 'Active' : 'Inactive', Created: d.createdAt,
  }));

  const columns: Column<Dept>[] = [
    { key: 'name',   header: 'Department', sortable: true, sortValue: (d) => d.name, cell: (d) => (
      <div><p className="font-medium text-sm text-[#0e5467] dark:text-foreground">{d.name}</p><p className="text-[10px] font-mono text-muted-foreground">{d.departmentId || d.id}</p></div>
    ) },
    { key: 'head',   header: 'Head', cell: (d) => headName(d) || <span className="text-xs text-muted-foreground italic">—</span> },
    { key: 'users',  header: 'Users', sortable: true, sortValue: (d) => userCount(d), cell: (d) => { const c = userCount(d); return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-xs font-medium tabular-nums">{c}</span>; } },
    { key: 'status', header: 'Status', cell: (d) => <button onClick={() => toggleStatus(d)}><StatusBadge status={d.isActive ? 'Active' : 'Inactive'} /></button> },
    { key: 'actions', header: '', width: 'w-12', cell: (d) => (
      <ActionMenu actions={[
        { label: 'View Details', icon: Eye, onClick: () => setDetail(d) },
        { label: 'Edit', icon: Pencil, onClick: () => openEdit(d), show: canEdit },
        { label: 'Duplicate', icon: Copy, onClick: async () => {
            try { await addDepartment({ name: `${d.name} (Copy)`, isActive: true, organization: user?.organization } as Partial<IDepartment>); toast.success('Duplicated'); }
            catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong'); }
          }, show: canCreate },
        { label: 'Toggle Status', icon: ToggleLeft, onClick: () => toggleStatus(d), show: canEdit },
        { label: 'Copy ID', icon: Copy, onClick: () => { navigator.clipboard.writeText(d.id); toast.success('ID copied'); }, separatorBefore: true },
        { label: 'View History', icon: History, onClick: () => setHistory(d) },
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

      <DataTable columns={columns} data={filtered} loading={loading} emptyTitle="No departments"
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
              <SheetDescription>{detail.departmentId || detail.id}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Status', detail.isActive ? 'Active' : 'Inactive'],
                  ['Head', headName(detail) || '—'],
                  ['Users', userCount(detail)],
                  ['Created', formatDate(detail.createdAt)],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">{label}</dt>
                    <dd className="mt-1 text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
              {detail.description && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-1">Description</dt>
                  <dd className="text-sm">{detail.description}</dd>
                </div>
              )}
            </SheetBody>
          </>
        )}
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name} onConfirm={handleDelete} />
      <AuditHistoryDialog open={!!history} onOpenChange={(o) => !o && setHistory(null)} entityType="Department" entityName={history?.name} />
    </PageWrapper>
  );
};
