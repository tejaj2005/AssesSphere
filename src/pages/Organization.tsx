import { useState } from 'react';
import { Building2, Pencil, Check, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useData } from '@/context/DataContext';
import { formatDate } from '@/lib/utils';

const TYPES = [
  { label: 'Engineering', value: 'ENGINEERING' },
  { label: 'Manufacturing', value: 'MANUFACTURING' },
  { label: 'Pharmaceutical', value: 'PHARMACEUTICAL' },
  { label: 'Automotive', value: 'AUTOMOTIVE' },
  { label: 'Electronics', value: 'ELECTRONICS' },
];

export const OrganizationPage = () => {
  const { organization, updateOrganization } = useData();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(organization.name);
  const [type, setType] = useState(organization.type);
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    if (!name.trim()) { setErr('Organization name is required'); return; }
    updateOrganization({ name: name.trim(), type });
    toast.success('Organization updated');
    setEditing(false);
  };

  const cancel = () => {
    setName(organization.name); setType(organization.type); setErr(null); setEditing(false);
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Organization"
        description="Your organization's primary details and settings."
      />
      <Card className="p-8 max-w-3xl">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            {!editing ? (
              <>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">{organization.name}</h2>
                    <Badge variant="accent" className="mt-2">{TYPES.find((t) => t.value === organization.type)?.label || organization.type}</Badge>
                  </div>
                  <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Organization ID</p>
                    <p className="mt-1 text-sm font-mono">{organization.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Established</p>
                    <p className="mt-1 text-sm inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDate(organization.createdAt)}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label>Organization Name</Label>
                  <Input value={name} error={!!err} onChange={(e) => { setName(e.target.value); setErr(null); }} placeholder="Acme Corp." />
                  {err && <p className="text-xs text-destructive">{err}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Industry Type</Label>
                  <Select value={type} onChange={setType} options={TYPES} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="accent" onClick={save}><Check className="h-4 w-4" /> Save</Button>
                  <Button variant="ghost" onClick={cancel}><X className="h-4 w-4" /> Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </PageWrapper>
  );
};
