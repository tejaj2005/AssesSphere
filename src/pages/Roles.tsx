import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, Clipboard, Warehouse, Award, HardHat, Plus, Check, X, ShieldPlus, Trash2, Pencil, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { ALL_PAGES } from '@/data/mockData';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { Permission } from '@/types';

/** Backend Role shape (server/models/Role.ts) — name is a plain string, no FK to User. */
interface Role {
  id: string;
  _id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Record<string, Permission>;
  organization?: string;
}

// Backend seeds system role names in PascalCase (no spaces) — matches User.role enum exactly.
const ROLE_ICONS: Record<string, any> = { Admin: ShieldCheck, Management: Eye, ProductionManager: Clipboard, StoresManager: Warehouse, QualityManager: Award, Inspector: HardHat };

/** "ProductionManager" -> "Production Manager" for display; custom role names (already spaced) pass through. */
const formatRoleName = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1 $2');

export const RolesPage = () => {
  const { user } = useAuth();
  const { items: roles, loading, create: addRole, update: updateRole, remove: deleteRole } = useApiResource<Role>('/roles');
  // Read-only: used only to count users per role (User.role is a plain enum string, not a Role FK).
  const { items: users } = useApiResource<any>('/admin/users');
  const [view, setView] = useState<Role | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Role | null>(null);

  const blankPerm = (): Record<string, Permission> => ALL_PAGES.reduce((a, p) => { a[p] = { view: false, create: false, edit: false, delete: false }; return a; }, {} as Record<string, Permission>);

  const [form, setForm] = useState<{ name: string; description: string; permissions: Record<string, Permission> }>({
    name: '', description: '', permissions: blankPerm(),
  });
  const [err, setErr] = useState('');

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', permissions: blankPerm() }); setErr(''); setDrawerOpen(true); };
  // Backend roles (e.g. system-seeded ones) may only have sparse entries in `permissions` (a '*' wildcard
  // plus a few specific pages) — merge onto a full blankPerm() so every ALL_PAGES key is always present.
  const openEdit = (r: Role) => { setEditing(r); setForm({ name: r.name, description: r.description, permissions: { ...blankPerm(), ...r.permissions } }); setErr(''); setDrawerOpen(true); };

  const submit = async () => {
    if (!form.name.trim()) { setErr('Role name is required'); return; }
    try {
      if (editing) {
        await updateRole(editing.id, { name: form.name.trim(), description: form.description.trim() || 'Custom role', permissions: form.permissions });
        toast.success('Role updated');
      } else {
        await addRole({ name: form.name.trim(), description: form.description.trim() || 'Custom role', isSystem: false, permissions: form.permissions, organization: user?.organization });
        toast.success('Role created');
      }
      setDrawerOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setErr(msg);
      toast.error(msg);
    }
  };

  const togglePerm = (page: string, key: keyof Permission) => {
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [page]: { ...f.permissions[page], [key]: !f.permissions[page][key] } } }));
  };

  const toggleAllForPage = (page: string, value: boolean) => {
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [page]: { view: value, create: value, edit: value, delete: value } } }));
  };

  const setAllPermissions = (value: boolean) => {
    setForm((f) => {
      const perms: Record<string, Permission> = {};
      ALL_PAGES.forEach((p) => { perms[p] = { view: value, create: value, edit: value, delete: value }; });
      return { ...f, permissions: perms };
    });
  };

  const duplicateRole = (r: Role) => {
    setEditing(null);
    setForm({ name: `${formatRoleName(r.name)} (Copy)`, description: r.description, permissions: { ...blankPerm(), ...r.permissions } });
    setErr(''); setDrawerOpen(true);
  };

  const userCountFor = (r: Role) => users.filter((u) => u.role === r.name).length;

  const exportData = roles.map((r) => ({
    Name: formatRoleName(r.name), Description: r.description, Type: r.isSystem ? 'System' : 'Custom',
    Users: userCountFor(r),
  }));

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader
        title="Roles & Permissions"
        description="Manage system roles and their permission matrices."
        action={
          <>
            <DataToolbar data={exportData} filename="pqas-roles" />
            <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Custom Role</Button>
          </>
        }
      />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((r) => {
          const Icon = ROLE_ICONS[r.name] || ShieldCheck;
          const userCount = userCountFor(r);
          return (
            <motion.div key={r.id} variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="p-6 hover:shadow-md h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  {r.isSystem ? <Badge variant="slate">System</Badge> : <Badge variant="accent">Custom</Badge>}
                </div>
                <h3 className="font-semibold mb-1">{formatRoleName(r.name)}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{r.description}</p>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-xs text-muted-foreground">{userCount} user{userCount !== 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => duplicateRole(r)} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Button>
                    {!r.isSystem && <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>}
                    <Button variant="outline" size="sm" onClick={() => setView(r)}>View</Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
        <motion.div variants={staggerItem}>
          <button
            onClick={openAdd}
            className="w-full h-full min-h-[200px] rounded-xl border-2 border-dashed bg-transparent p-6 flex flex-col items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            <ShieldPlus className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">Add Custom Role</span>
          </button>
        </motion.div>
      </motion.div>

      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)} className="!w-[640px]">
        {view && (
          <>
            <SheetHeader>
              <SheetTitle>{formatRoleName(view.name)} — Permissions</SheetTitle>
              <SheetDescription>{view.description}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#0e5467] text-white">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider">Module</th>
                      {(['View', 'Create', 'Edit', 'Delete'] as const).map((k) => (
                        <th key={k} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-center">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ALL_PAGES.map((p) => {
                      const perm = view.permissions[p] || { view: false, create: false, edit: false, delete: false };
                      return (
                        <tr key={p}>
                          <td className="px-4 py-2.5 font-medium text-xs">{p}</td>
                          {(['view', 'create', 'edit', 'delete'] as const).map((k) => (
                            <td key={k} className="px-3 py-2.5 text-center">
                              {perm[k] ? <Check className="h-4 w-4 text-success inline-block" /> : <X className="h-4 w-4 text-muted-foreground/40 inline-block" />}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SheetBody>
            <SheetFooter>
              <Button variant="outline" onClick={() => { setView(null); duplicateRole(view); }}><Copy className="h-4 w-4" /> Duplicate</Button>
              {!view.isSystem && (
                <>
                  <Button variant="outline" onClick={() => { setView(null); openEdit(view); }}><Pencil className="h-4 w-4" /> Edit</Button>
                  <Button variant="destructive" onClick={() => { setView(null); setConfirmDel(view); }}><Trash2 className="h-4 w-4" /> Delete</Button>
                </>
              )}
            </SheetFooter>
          </>
        )}
      </Sheet>

      <FormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title={editing ? 'Edit Role' : 'Add Custom Role'} description={editing ? 'Update role and its permissions.' : 'Define a new role with custom permissions.'} onSubmit={submit} submitLabel={editing ? 'Update' : 'Create Role'}>
        <div className="space-y-1.5">
          <Label>Role Name <span className="text-destructive">*</span></Label>
          <Input value={form.name} error={!!err} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErr(''); }} placeholder="e.g. Auditor" />
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What this role can do" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Permissions</Label>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => setAllPermissions(true)}>All</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAllPermissions(false)}>None</Button>
            </div>
          </div>
          <div className="rounded-lg border max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#0e5467] text-white sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Module</th>
                  <th className="px-3 py-2.5 w-16 text-center font-semibold uppercase tracking-wider text-[10px]">View</th>
                  <th className="px-3 py-2.5 w-16 text-center font-semibold uppercase tracking-wider text-[10px]">Create</th>
                  <th className="px-3 py-2.5 w-16 text-center font-semibold uppercase tracking-wider text-[10px]">Edit</th>
                  <th className="px-3 py-2.5 w-16 text-center font-semibold uppercase tracking-wider text-[10px]">Delete</th>
                  <th className="px-3 py-2.5 w-16 text-center font-semibold uppercase tracking-wider text-[10px]">All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ALL_PAGES.map((p) => {
                  const perm = form.permissions[p] || { view: false, create: false, edit: false, delete: false };
                  const allSet = perm.view && perm.create && perm.edit && perm.delete;
                  return (
                    <tr key={p} className="hover:bg-[#e8f4f7]/60 dark:hover:bg-[#0e5467]/20 transition-colors">
                      <td className="px-3 py-2 font-medium">{p}</td>
                      {(['view', 'create', 'edit', 'delete'] as const).map((k) => (
                        <td key={k} className="px-3 py-2 text-center">
                          <Checkbox checked={perm[k] || false} onCheckedChange={() => togglePerm(p, k)} />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <Checkbox checked={allSet} onCheckedChange={() => toggleAllForPage(p, !allSet)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground italic">Tick each cell to grant the matching permission. Use the rightmost column to grant all four at once.</p>
        </div>
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={async () => {
          if (!confirmDel) return;
          if (confirmDel.isSystem) { toast.error('Cannot delete a system role'); setConfirmDel(null); return; }
          try {
            await deleteRole(confirmDel.id);
            toast.success('Role deleted');
            setConfirmDel(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete role');
          }
        }} />
    </PageWrapper>
  );
};
