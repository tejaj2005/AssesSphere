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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Sheet, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { useData } from '@/context/DataContext';
import { isValidEmail, nextId } from '@/lib/utils';
import type { User } from '@/types';

const ROLE_VARIANT: Record<string, any> = { Admin: 'slate', Management: 'purple', 'Production Manager': 'accent', 'Stores Manager': 'teal', 'Quality Manager': 'warning', Inspector: 'success' };

export const UsersPage = () => {
  const { users, roles, departments, addUser, updateUser, deleteUser, bulkUpdateUserStatus } = useData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmDel, setConfirmDel] = useState<User | null>(null);
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const initialForm = { name: '', employeeId: nextId('EMP', users), email: '', roleId: '', departmentId: '', status: 'Active' as 'Active' | 'Inactive' };
  const [form, setForm] = useState(initialForm);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const filtered = useMemo(() => users.filter((u) => {
    const q = search.toLowerCase();
    if (search && !(u.name.toLowerCase().includes(q) || u.employeeId.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
    if (roleFilter !== 'all' && u.roleId !== roleFilter) return false;
    if (deptFilter !== 'all' && u.departmentId !== deptFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  }), [users, search, roleFilter, deptFilter, statusFilter]);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm, employeeId: nextId('EMP', users) }); setErrs({}); setDrawerOpen(true); };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, employeeId: u.employeeId, email: u.email, roleId: u.roleId, departmentId: u.departmentId, status: u.status });
    setErrs({}); setDrawerOpen(true);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.employeeId.trim()) e.employeeId = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!isValidEmail(form.email)) e.email = 'Invalid email';
    if (!form.roleId) e.roleId = 'Required';
    if (!form.departmentId) e.departmentId = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    const res = editing ? updateUser(editing.id, form) : addUser(form);
    if (!res.success) { toast.error(res.error || 'Failed'); return; }
    toast.success(editing ? 'User updated' : 'User created');
    setDrawerOpen(false);
  };

  const handleBulkStatus = (status: 'Active' | 'Inactive') => {
    bulkUpdateUserStatus(selected, status);
    toast.success(`${selected.length} user${selected.length > 1 ? 's' : ''} marked ${status}`);
    setSelected([]);
  };

  const handleBulkDelete = () => {
    selected.forEach((id) => deleteUser(id));
    toast.success(`${selected.length} users deleted`);
    setSelected([]); setConfirmBulkDel(false);
  };

  const handleDelete = () => {
    if (!confirmDel) return;
    deleteUser(confirmDel.id);
    toast.success(`${confirmDel.name} deleted`);
    setConfirmDel(null);
  };

  const handleImport = (rows: Record<string, string>[]) => {
    let ok = 0, fail = 0;
    rows.forEach((r) => {
      const role = roles.find((x) => x.name.toLowerCase() === (r.Role || r.role || '').toLowerCase());
      const dept = departments.find((x) => x.name.toLowerCase() === (r.Department || r.department || '').toLowerCase());
      if (!role || !dept) { fail++; return; }
      const res = addUser({
        name: r.Name || r.name || '',
        employeeId: r['Employee ID'] || r.employeeId || nextId('EMP', users),
        email: r.Email || r.email || '',
        roleId: role.id, departmentId: dept.id, status: 'Active',
      });
      if (res.success) ok++; else fail++;
    });
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
    'Employee ID': u.employeeId,
    Email: u.email,
    Role: roles.find((r) => r.id === u.roleId)?.name || '',
    Department: departments.find((d) => d.id === u.departmentId)?.name || '',
    Status: u.status,
  }));

  const columns: Column<User>[] = [
    { key: 'name',  header: 'Name', sortable: true, sortValue: (u) => u.name, cell: (u) => (
      <div className="flex items-center gap-3"><Avatar name={u.name} size="sm" /><span className="font-medium">{u.name}</span></div>
    ) },
    { key: 'emp',   header: 'Employee ID', sortable: true, sortValue: (u) => u.employeeId, cell: (u) => <span className="text-xs font-mono text-muted-foreground">{u.employeeId}</span> },
    { key: 'email', header: 'Email', cell: (u) => <span className="text-sm">{u.email}</span> },
    { key: 'role',  header: 'Role', cell: (u) => { const r = roles.find((x) => x.id === u.roleId); return r ? <Badge variant={ROLE_VARIANT[r.name] || 'outline'}>{r.name}</Badge> : '—'; } },
    { key: 'dept',  header: 'Department', cell: (u) => departments.find((d) => d.id === u.departmentId)?.name || '—' },
    { key: 'status', header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
    { key: 'actions', header: '', width: 'w-12', cell: (u) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => setDetailUser(u)}><Eye className="h-4 w-4" /> View Details</DropdownItem>
          <DropdownItem onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /> Edit User</DropdownItem>
          <DropdownItem onClick={() => updateUser(u.id, { status: u.status === 'Active' ? 'Inactive' : 'Active' })}>
            {u.status === 'Active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            {u.status === 'Active' ? 'Deactivate' : 'Activate'}
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
        <Select value={roleFilter} onChange={setRoleFilter} options={[{ label: 'All Roles', value: 'all' }, ...roles.map((r) => ({ label: r.name, value: r.id }))]} className="sm:w-40" />
        <Select value={deptFilter} onChange={setDeptFilter} options={[{ label: 'All Departments', value: 'all' }, ...departments.map((d) => ({ label: d.name, value: d.id }))]} className="sm:w-44" />
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
        <div className="space-y-1.5">
          <Label>Full Name <span className="text-destructive">*</span></Label>
          <Input value={form.name} error={!!errs.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrs({ ...errs, name: '' }); }} />
          {errs.name && <p className="text-xs text-destructive">{errs.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Employee ID <span className="text-destructive">*</span></Label>
          <Input value={form.employeeId} disabled={!!editing} error={!!errs.employeeId} onChange={(e) => { setForm({ ...form, employeeId: e.target.value }); setErrs({ ...errs, employeeId: '' }); }} />
          {errs.employeeId && <p className="text-xs text-destructive">{errs.employeeId}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Email <span className="text-destructive">*</span></Label>
          <Input type="email" value={form.email} error={!!errs.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrs({ ...errs, email: '' }); }} />
          {errs.email && <p className="text-xs text-destructive">{errs.email}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Role <span className="text-destructive">*</span></Label>
            <Select value={form.roleId} onChange={(v) => setForm({ ...form, roleId: v })} options={roles.map((r) => ({ label: r.name, value: r.id }))} error={!!errs.roleId} placeholder="Select role" />
            {errs.roleId && <p className="text-xs text-destructive">{errs.roleId}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Department <span className="text-destructive">*</span></Label>
            <Select value={form.departmentId} onChange={(v) => setForm({ ...form, departmentId: v })} options={departments.filter((d) => d.status === 'Active').map((d) => ({ label: d.name, value: d.id }))} error={!!errs.departmentId} placeholder="Select department" />
            {errs.departmentId && <p className="text-xs text-destructive">{errs.departmentId}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Label>Active</Label>
          <Switch checked={form.status === 'Active'} onCheckedChange={(c) => setForm({ ...form, status: c ? 'Active' : 'Inactive' })} />
        </div>
      </FormDrawer>

      <Sheet open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)}>
        {detailUser && (
          <>
            <SheetHeader><SheetTitle>User Details</SheetTitle></SheetHeader>
            <SheetBody>
              <div className="flex items-center gap-4 mb-6">
                <Avatar name={detailUser.name} size="lg" />
                <div>
                  <p className="text-lg font-semibold">{detailUser.name}</p>
                  <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Employee ID</dt><dd className="mt-1 font-mono">{detailUser.employeeId}</dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Status</dt><dd className="mt-1"><StatusBadge status={detailUser.status} /></dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Role</dt><dd className="mt-1">{roles.find((r) => r.id === detailUser.roleId)?.name}</dd></div>
                <div><dt className="text-xs text-muted-foreground uppercase tracking-wider">Department</dt><dd className="mt-1">{departments.find((d) => d.id === detailUser.departmentId)?.name}</dd></div>
              </dl>
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
