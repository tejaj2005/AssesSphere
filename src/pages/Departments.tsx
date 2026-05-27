import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal, Eye, Copy } from 'lucide-react';
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
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { useData } from '@/context/DataContext';
import type { Department } from '@/types';

export const DepartmentsPage = () => {
  const { departments, users, addDepartment, updateDepartment, deleteDepartment } = useData();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Department | null>(null);

  const filtered = useMemo(() => departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())), [departments, search]);

  const openAdd = () => { setEditing(null); setName(''); setErr(null); setDrawerOpen(true); };
  const openEdit = (d: Department) => { setEditing(d); setName(d.name); setErr(null); setDrawerOpen(true); };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setErr('Department name is required'); return; }
    const res = editing
      ? updateDepartment(editing.id, { name: trimmed })
      : addDepartment({ name: trimmed, status: 'Active' });
    if (!res.success) { setErr(res.error || 'Failed'); toast.error(res.error || 'Failed'); return; }
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
    rows.forEach((r) => { const n = r.Department || r.Name || r.name; if (n) { const res = addDepartment({ name: n, status: 'Active' }); if (res.success) ok++; } });
    toast.success(`${ok} departments imported`);
  };

  const exportData = departments.map((d) => ({
    Department: d.name, ID: d.id,
    Users: users.filter((u) => u.departmentId === d.id).length,
    Status: d.status, Created: d.createdAt,
  }));

  const columns: Column<Department>[] = [
    { key: 'name',   header: 'Department', sortable: true, sortValue: (d) => d.name, cell: (d) => <span className="font-medium">{d.name}</span> },
    { key: 'id',     header: 'ID', sortable: true, sortValue: (d) => d.id, cell: (d) => <span className="text-xs font-mono text-muted-foreground">{d.id}</span> },
    { key: 'users',  header: 'Users', sortable: true, sortValue: (d) => users.filter((u) => u.departmentId === d.id).length, cell: (d) => { const c = users.filter((u) => u.departmentId === d.id).length; return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">{c}</span>; } },
    { key: 'status', header: 'Status', cell: (d) => <button onClick={() => toggleStatus(d)}><StatusBadge status={d.status} /></button> },
    { key: 'actions', header: '', width: 'w-12', cell: (d) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
          <DropdownItem onClick={() => toggleStatus(d)}><Eye className="h-4 w-4" /> Toggle Status</DropdownItem>
          <DropdownItem onClick={() => { navigator.clipboard.writeText(d.id); toast.success('ID copied'); }}><Copy className="h-4 w-4" /> Copy ID</DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onClick={() => setConfirmDel(d)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
        </Dropdown>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Departments"
        description="Manage organizational departments."
        action={
          <>
            <DataToolbar data={exportData} filename="pqas-departments" onImport={handleImport} />
            <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Department</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search departments…" className="sm:w-72" />
      </div>

      <DataTable
        columns={columns} data={filtered}
        emptyTitle="No departments"
        emptyDescription={search ? `No results for "${search}"` : 'Add your first department to get started.'}
        emptyAction={!search && <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Department</Button>}
      />

      <FormDrawer
        open={drawerOpen} onOpenChange={setDrawerOpen}
        title={editing ? 'Edit Department' : 'Add Department'}
        description={editing ? 'Update department details.' : 'Create a new organizational department.'}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Create'}
      >
        <div className="space-y-1.5">
          <Label>Department Name <span className="text-destructive">*</span></Label>
          <Input value={name} error={!!err} onChange={(e) => { setName(e.target.value); setErr(null); }} placeholder="e.g. Production" autoFocus />
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name} onConfirm={handleDelete} />
    </PageWrapper>
  );
};
