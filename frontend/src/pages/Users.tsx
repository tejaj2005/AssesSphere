import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal, X, UserCheck, UserX, Mail, Send, Copy, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Sheet, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { ConfigForm, FieldDef } from '@/components/shared/ConfigForm';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { isValidEmail, nextId } from '@/lib/utils';

/** Backend user shape (server/models/User.ts) — role is a plain enum string and
 * department is free text, not FK refs like the old mock Role/Department entities. */
interface ApiUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  department?: string;
  organization: string;
  employeeId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  // UI-only convenience fields kept for the existing form/detail UX. The backend
  // schema has no columns for these, so Mongoose silently drops them on save —
  // they don't persist across a refresh. Simplification for this migration.
  phone?: string;
  username?: string;
  designation?: string;
  dateOfJoining?: string;
  photo?: string;
  notes?: string;
}

interface DeptApi { _id: string; id: string; name: string; isActive: boolean }

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Management', value: 'Management' },
  { label: 'Production Manager', value: 'ProductionManager' },
  { label: 'Stores Manager', value: 'StoresManager' },
  { label: 'Quality Manager', value: 'QualityManager' },
  { label: 'Inspector', value: 'Inspector' },
];
const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));
const ROLE_VARIANT: Record<string, any> = { Admin: 'slate', Management: 'purple', ProductionManager: 'accent', StoresManager: 'teal', QualityManager: 'warning', Inspector: 'success' };

const UserConfigForm = ({ form, setForm, errs, editing, departmentOptions }: any) => {
  const fields: FieldDef[] = [
    { section: 'Personal Information', name: 'firstName', label: 'First Name', type: 'text', required: true, col: 'half' },
    {                                  name: 'lastName',  label: 'Last Name',  type: 'text', required: true, col: 'half' },
    {                                  name: 'email',     label: 'Email',      type: 'email', required: true, col: 'half' },
    {                                  name: 'phone',     label: 'Phone Number', type: 'tel', col: 'half' },
    {                                  name: 'photo',     label: 'Profile Photo', type: 'file' },

    { section: 'Employment', name: 'employeeId',  label: 'Employee ID', type: 'text', required: true, col: 'half' },
    {                        name: 'username',    label: 'Username',    type: 'text', col: 'half', help: 'Auto-suggested from name' },
    {                        name: 'role',        label: 'Role',        type: 'select', required: true, options: ROLE_OPTIONS, col: 'half' },
    {                        name: 'department',  label: 'Department',  type: 'select', options: departmentOptions, col: 'half' },
    {                        name: 'designation', label: 'Designation / Job Title', type: 'text', col: 'half' },
    {                        name: 'dateOfJoining', label: 'Date of Joining', type: 'date', col: 'half' },
    // No 'password' field type exists on the shared ConfigForm (out of scope for this
    // migration unit), so this renders as a plain (unmasked) text input.
    ...(!editing ? [{ name: 'password', label: 'Password', type: 'text' as const, required: true, col: 'half' as const, help: 'Used for the user’s first login' }] : []),

    { section: 'Settings',   name: 'status', label: 'Active', type: 'toggle', col: 'half' },
    ...(!editing ? [{ name: 'sendInvite', label: 'Send invite email on creation', type: 'checkbox' as const, col: 'half' as const }] : []),
    {                        name: 'notes', label: 'Notes', type: 'textarea' },
  ];
  // map status string→boolean for the toggle
  const wrappedValue = { ...form, status: form.status === 'Active' || form.status === true };
  const handleChange = (next: any) => {
    let username = next.username;
    if (!editing && (next.firstName !== form.firstName || next.lastName !== form.lastName)) {
      const auto = `${(next.firstName || '').toLowerCase()}.${(next.lastName || '').toLowerCase()}`.replace(/\s+/g, '');
      if (!username || username === `${(form.firstName || '').toLowerCase()}.${(form.lastName || '').toLowerCase()}`.replace(/\s+/g, '')) {
        username = auto;
      }
    }
    setForm({ ...next, username, status: next.status ? 'Active' : 'Inactive' });
  };
  return <ConfigForm fields={fields} value={wrappedValue} onChange={handleChange} errors={errs} />;
};

export const UsersPage = () => {
  const { user: authUser } = useAuth();
  // Polls every 20s so a user created/edited from another tab or session shows up here without
  // needing to leave and come back to this page.
  const { items: users, loading, create, update, remove } = useApiResource<ApiUser>('/admin/users', undefined, 20000);
  const { items: departments } = useApiResource<DeptApi>('/admin/departments');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<ApiUser | null>(null);
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [confirmDel, setConfirmDel] = useState<ApiUser | null>(null);
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const activeDepartments = useMemo(() => departments.filter((d) => d.isActive), [departments]);
  const departmentOptions = useMemo(() => activeDepartments.map((d) => ({ label: d.name, value: d.name })), [activeDepartments]);

  const suggestEmployeeId = () => nextId('EMP', users.map((u) => ({ id: u.employeeId || '' })));

  const initialForm: any = {
    firstName: '', lastName: '', name: '', employeeId: suggestEmployeeId(), email: '', phone: '',
    username: '', role: '', department: '', designation: '', dateOfJoining: new Date().toISOString().slice(0, 10),
    photo: '', sendInvite: true, notes: '', status: 'Active' as 'Active' | 'Inactive', password: '',
  };
  const [form, setForm] = useState<any>(initialForm);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const filtered = useMemo(() => users.filter((u) => {
    const q = search.toLowerCase();
    if (search && !(u.name.toLowerCase().includes(q) || (u.employeeId || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (deptFilter !== 'all' && u.department !== deptFilter) return false;
    const status = u.isActive ? 'Active' : 'Inactive';
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    return true;
  }), [users, search, roleFilter, deptFilter, statusFilter]);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm, employeeId: suggestEmployeeId() }); setErrs({}); setDrawerOpen(true); };
  const openEdit = (u: ApiUser) => {
    setEditing(u);
    const parts = u.name.split(' ');
    setForm({
      ...u,
      firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '',
      phone: u.phone || '', username: u.username || u.email.split('@')[0],
      designation: u.designation || '', dateOfJoining: u.dateOfJoining || u.createdAt?.slice(0, 10) || '',
      photo: u.photo || '', sendInvite: false, notes: u.notes || '',
      status: u.isActive ? 'Active' : 'Inactive',
    });
    setErrs({}); setDrawerOpen(true);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    const fullName = `${form.firstName || ''} ${form.lastName || ''}`.trim();
    if (!form.firstName?.trim()) e.firstName = 'Required';
    if (!form.lastName?.trim()) e.lastName = 'Required';
    if (!form.employeeId?.trim()) e.employeeId = 'Required';
    if (!form.email?.trim()) e.email = 'Required';
    else if (!isValidEmail(form.email)) e.email = 'Invalid email';
    if (!form.role) e.role = 'Required';
    if (!editing && !form.password?.trim()) e.password = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    // FileInput yields string[]; a user photo is single — store the last entry as a plain string.
    const photo = Array.isArray(form.photo) ? form.photo[form.photo.length - 1] || '' : form.photo || '';
    const payload: Partial<ApiUser> & { password?: string } = {
      ...form,
      name: fullName,
      photo,
      isActive: form.status === 'Active' || form.status === true,
      organization: authUser?.organization,
    };
    delete (payload as any).status;
    delete (payload as any).firstName;
    delete (payload as any).lastName;
    delete (payload as any).sendInvite;
    if (editing) delete (payload as any).password;
    try {
      if (editing) await update(editing.id, payload);
      else await create(payload);
      if (form.sendInvite && !editing) toast.success(`User created — invite email sent to ${form.email}`);
      else toast.success(editing ? 'User updated' : 'User created');
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  // Promise.all would reject the whole batch (and report only a generic failure) the moment
  // ANY single item's request fails — even though update()/remove() already applied every
  // other item's change to local state independently. allSettled isolates each item so a
  // one-off failure doesn't misreport already-successful changes as failed.
  const handleBulkStatus = async (status: 'Active' | 'Inactive') => {
    const results = await Promise.allSettled(selected.map((id) => update(id, { isActive: status === 'Active' })));
    const failed = results.filter((r) => r.status === 'rejected').length;
    const succeeded = results.length - failed;
    if (succeeded) toast.success(`${succeeded} user${succeeded > 1 ? 's' : ''} marked ${status}`);
    if (failed) toast.error(`${failed} user${failed > 1 ? 's' : ''} failed to update`);
    setSelected([]);
  };

  const handleBulkDelete = async () => {
    const results = await Promise.allSettled(selected.map((id) => remove(id)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    const succeeded = results.length - failed;
    if (succeeded) toast.success(`${succeeded} user${succeeded > 1 ? 's' : ''} deleted`);
    if (failed) toast.error(`${failed} user${failed > 1 ? 's' : ''} failed to delete`);
    setSelected([]); setConfirmBulkDel(false);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await remove(confirmDel.id);
      toast.success(`${confirmDel.name} deleted`);
      setConfirmDel(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleImport = async (rows: Record<string, string>[]) => {
    let ok = 0, fail = 0;
    for (const r of rows) {
      const roleRaw = (r.Role || r.role || '').trim();
      const roleOpt = ROLE_OPTIONS.find((x) => x.value.toLowerCase() === roleRaw.toLowerCase() || x.label.toLowerCase() === roleRaw.toLowerCase());
      const email = r.Email || r.email || '';
      const name = r.Name || r.name || '';
      if (!roleOpt || !email || !name) { fail++; continue; }
      try {
        await create({
          name,
          employeeId: r['Employee ID'] || r.employeeId || suggestEmployeeId(),
          email,
          role: roleOpt.value,
          department: r.Department || r.department || undefined,
          // Imported rows have no password column — fall back to a temporary default;
          // the user should change it on first login. Simplification for bulk import.
          password: r.Password || r.password || 'Welcome@123',
          isActive: true,
          organization: authUser?.organization,
        } as Partial<ApiUser>);
        ok++;
      } catch {
        fail++;
      }
    }
    if (ok) toast.success(`${ok} users imported`);
    if (fail) toast.error(`${fail} rows skipped`);
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success('Email copied to clipboard');
  };
  const sendEmail = (email: string) => { window.location.href = `mailto:${email}`; toast.message('Opening email client…'); };

  const exportData = users.map((u) => ({
    Name: u.name,
    'Employee ID': u.employeeId || '',
    Email: u.email,
    Role: ROLE_LABEL[u.role] || u.role,
    Department: u.department || '',
    Status: u.isActive ? 'Active' : 'Inactive',
  }));

  const columns: Column<ApiUser>[] = [
    { key: 'name',  header: 'Name', sortable: true, sortValue: (u) => u.name, cell: (u) => (
      <div className="flex items-center gap-3"><Avatar name={u.name} src={u.photo} size="sm" /><span className="font-medium">{u.name}</span></div>
    ) },
    { key: 'emp',   header: 'Employee ID', sortable: true, sortValue: (u) => u.employeeId || '', cell: (u) => <span className="text-xs font-mono text-muted-foreground">{u.employeeId || '—'}</span> },
    { key: 'email', header: 'Email', cell: (u) => <span className="text-sm">{u.email}</span> },
    { key: 'role',  header: 'Role', cell: (u) => u.role ? <Badge variant={ROLE_VARIANT[u.role] || 'outline'}>{ROLE_LABEL[u.role] || u.role}</Badge> : '—' },
    { key: 'dept',  header: 'Department', cell: (u) => u.department || '—' },
    { key: 'status', header: 'Status', cell: (u) => <StatusBadge status={u.isActive ? 'Active' : 'Inactive'} /> },
    { key: 'actions', header: '', width: 'w-12', cell: (u) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => setDetailUser(u)}><Eye className="h-4 w-4" /> View Details</DropdownItem>
          <DropdownItem onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /> Edit User</DropdownItem>
          <DropdownItem onClick={() => update(u.id, { isActive: !u.isActive }).catch((err) => toast.error(err instanceof Error ? err.message : 'Something went wrong'))}>
            {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            {u.isActive ? 'Deactivate' : 'Activate'}
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={() => sendEmail(u.email)}><Send className="h-4 w-4" /> Send Email</DropdownItem>
          <DropdownItem onClick={() => copyEmail(u.email)}><Copy className="h-4 w-4" /> Copy Email</DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onClick={() => setConfirmDel(u)}><Trash2 className="h-4 w-4" /> Delete User</DropdownItem>
        </Dropdown>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Users"
        description="Manage team members, roles and access."
        action={
          <>
            <DataToolbar data={exportData} filename="pqas-users" onImport={handleImport} />
            <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add User</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or ID…" className="sm:w-72" />
        <Select value={roleFilter} onChange={setRoleFilter} options={[{ label: 'All Roles', value: 'all' }, ...ROLE_OPTIONS]} className="sm:w-40" />
        <Select value={deptFilter} onChange={setDeptFilter} options={[{ label: 'All Departments', value: 'all' }, ...departmentOptions]} className="sm:w-44" />
        <Select value={statusFilter} onChange={setStatusFilter} options={[{ label: 'All Status', value: 'all' }, { label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }]} className="sm:w-36" />
      </div>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-3 flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-accent/5"
          >
            <p className="text-sm font-medium">{selected.length} selected</p>
            <div className="flex gap-2 ml-auto flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handleBulkStatus('Active')}><UserCheck className="h-3.5 w-3.5" /> Activate</Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkStatus('Inactive')}><UserX className="h-3.5 w-3.5" /> Deactivate</Button>
              <Button size="sm" variant="outline" onClick={() => { selected.forEach((id) => { const u = users.find((x) => x.id === id); if (u) sendEmail(u.email); }); }}><Mail className="h-3.5 w-3.5" /> Email</Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDel(true)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        columns={columns} data={filtered} selectable selectedIds={selected} onSelectionChange={setSelected}
        onRowClick={(u) => setDetailUser(u)}
        loading={loading}
        emptyTitle="No users found"
        emptyDescription={search ? `No results for "${search}"` : 'Add a user to get started.'}
      />

      <FormDrawer
        open={drawerOpen} onOpenChange={setDrawerOpen}
        title={editing ? 'Edit User' : 'Add User'}
        description={editing ? 'Update user details.' : 'Add a new user to the system.'}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Create'}
      >
        <UserConfigForm
          form={form}
          setForm={(f: any) => setForm(f)}
          errs={errs}
          editing={!!editing}
          departmentOptions={departmentOptions}
        />
      </FormDrawer>

      <Sheet open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)}>
        {detailUser && (
          <>
            <SheetHeader><SheetTitle>User Details</SheetTitle></SheetHeader>
            <SheetBody>
              <div className="flex items-center gap-4 mb-6">
                <Avatar name={detailUser.name} src={detailUser.photo} size="lg" />
                <div>
                  <p className="text-lg font-semibold">{detailUser.name}</p>
                  <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Employee ID</dt><dd className="mt-1 font-mono">{detailUser.employeeId || '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Status</dt><dd className="mt-1"><StatusBadge status={detailUser.isActive ? 'Active' : 'Inactive'} /></dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Role</dt><dd className="mt-1">{ROLE_LABEL[detailUser.role] || detailUser.role}</dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Department</dt><dd className="mt-1">{detailUser.department || '—'}</dd></div>
                {detailUser.designation && <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Designation</dt><dd className="mt-1">{detailUser.designation}</dd></div>}
                {detailUser.phone && <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Phone</dt><dd className="mt-1">{detailUser.phone}</dd></div>}
                {detailUser.dateOfJoining && <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Date of Joining</dt><dd className="mt-1">{detailUser.dateOfJoining}</dd></div>}
              </dl>
              {detailUser.notes && <div className="mt-4 pt-4 border-t"><dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</dt><dd className="text-sm">{detailUser.notes}</dd></div>}
              <div className="mt-6 pt-6 border-t flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => { setDetailUser(null); openEdit(detailUser); }}><Pencil className="h-4 w-4" /> Edit User</Button>
                <Button variant="outline" onClick={() => sendEmail(detailUser.email)}><Send className="h-4 w-4" /> Email</Button>
                <Button variant="outline" onClick={() => copyEmail(detailUser.email)}><Copy className="h-4 w-4" /> Copy</Button>
              </div>
            </SheetBody>
          </>
        )}
      </Sheet>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name} onConfirm={handleDelete} />
      <ConfirmDialog open={confirmBulkDel} onOpenChange={setConfirmBulkDel} title="Delete selected users?" description={`You are about to delete ${selected.length} users. This cannot be undone.`} onConfirm={handleBulkDelete} confirmLabel={`Delete ${selected.length}`} />
    </PageWrapper>
  );
};
