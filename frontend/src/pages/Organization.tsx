import { useEffect, useState } from 'react';
import { Building2, Pencil, Calendar, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { ConfigForm, FieldDef, validateConfigForm } from '@/components/shared/ConfigForm';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface IOrganization {
  _id: string;
  id: string;
  name: string;
  orgId: string;
  industry: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const INDUSTRY_OPTS = [
  { label: 'Engineering', value: 'ENGINEERING' },
  { label: 'Manufacturing', value: 'MANUFACTURING' },
  { label: 'Pharmaceutical', value: 'PHARMACEUTICAL' },
  { label: 'Automotive', value: 'AUTOMOTIVE' },
  { label: 'Electronics', value: 'ELECTRONICS' },
  { label: 'Aerospace', value: 'AEROSPACE' },
  { label: 'Food & Beverage', value: 'FOOD_BEVERAGE' },
  { label: 'Chemical', value: 'CHEMICAL' },
];
const ISO_OPTS = [
  { label: 'ISO 9001 (Quality)', value: 'ISO_9001' },
  { label: 'ISO 14001 (Environment)', value: 'ISO_14001' },
  { label: 'ISO 17025 (Lab)', value: 'ISO_17025' },
  { label: 'ISO 27001 (InfoSec)', value: 'ISO_27001' },
  { label: 'ISO 45001 (Safety)', value: 'ISO_45001' },
  { label: 'ISO 13485 (Medical)', value: 'ISO_13485' },
];
const COUNTRY_OPTS = [
  { label: 'India', value: 'IN' }, { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'UK' }, { label: 'Germany', value: 'DE' },
  { label: 'Japan', value: 'JP' }, { label: 'Singapore', value: 'SG' },
];

const ORG_FIELDS: FieldDef[] = [
  { section: 'Identity', name: 'name',      label: 'Organization Name', type: 'text', required: true, col: 'half' },
  {                       name: 'orgId',    label: 'Organization Code', type: 'readonly', col: 'half' },
  {                       name: 'industry', label: 'Industry / Sector', type: 'select', required: true, options: INDUSTRY_OPTS, col: 'half' },
  {                       name: 'established', label: 'Date Established', type: 'date', col: 'half' },
  {                       name: 'isActive', label: 'Active',            type: 'toggle', col: 'half' },

  { section: 'Address',   name: 'address1', label: 'Address Line 1',    type: 'text' },
  {                       name: 'address2', label: 'Address Line 2',    type: 'text' },
  {                       name: 'city',     label: 'City',              type: 'text', col: 'third' },
  {                       name: 'state',    label: 'State',             type: 'text', col: 'third' },
  {                       name: 'postal',   label: 'Postal Code',       type: 'text', col: 'third' },
  {                       name: 'country',  label: 'Country',           type: 'select', options: COUNTRY_OPTS, col: 'half' },

  { section: 'Contact',   name: 'phone',    label: 'Phone Number',      type: 'tel', col: 'half', placeholder: '+91 80 1234 5678' },
  {                       name: 'email',    label: 'Email',             type: 'email', col: 'half', placeholder: 'contact@company.com' },
  {                       name: 'website',  label: 'Website URL',       type: 'url', col: 'half', placeholder: 'https://company.com' },
  {                       name: 'logo',     label: 'Organization Logo', type: 'file', col: 'half' },

  { section: 'Compliance', name: 'accreditation', label: 'Accreditation Body', type: 'text', col: 'half', placeholder: 'e.g. NABL, UKAS' },
  {                        name: 'isoStandards',  label: 'ISO Standards',      type: 'multi-select', options: ISO_OPTS, col: 'half' },

  {                       name: 'notes',    label: 'Notes / Description', type: 'textarea' },
];

/** Merge the backend record's flat fields + settings bag into the flat shape ConfigForm/the view expect. */
const toFormValue = (org: IOrganization): Record<string, any> => {
  const settings = org.settings || {};
  return {
    name: org.name,
    orgId: org.orgId,
    industry: org.industry,
    isActive: org.isActive,
    address: org.address || '',
    email: org.contactEmail || '',
    phone: org.contactPhone || '',
    address1: settings.address1 ?? org.address ?? '',
    address2: settings.address2 ?? '',
    city: settings.city ?? '',
    state: settings.state ?? '',
    postal: settings.postal ?? '',
    country: settings.country ?? '',
    website: settings.website ?? '',
    logo: settings.logo ?? [],
    accreditation: settings.accreditation ?? '',
    isoStandards: settings.isoStandards ?? [],
    notes: settings.notes ?? '',
    established: settings.established ?? '',
  };
};

export const OrganizationPage = () => {
  const { user } = useAuth();
  const [org, setOrg] = useState<IOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.getList<IOrganization>('/admin/organizations');
        const mine = data.find((o) => (o as any)._id === user?.organization) || data[0] || null;
        if (!cancelled) setOrg(mine ? { ...mine, id: (mine as any)._id } : null);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Failed to load organization');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.organization]);

  const openEdit = () => {
    if (!org) return;
    setForm(toFormValue(org));
    setErrs({});
    setEditing(true);
  };

  const save = async () => {
    if (!org) return;
    const v = validateConfigForm(ORG_FIELDS, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix form errors'); return; }

    const payload = {
      name: form.name,
      industry: form.industry,
      address: [form.address1, form.address2, form.city, form.state, form.postal].filter(Boolean).join(', '),
      contactEmail: form.email,
      contactPhone: form.phone,
      isActive: !!form.isActive,
      settings: {
        ...(org.settings || {}),
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        postal: form.postal,
        country: form.country,
        website: form.website,
        logo: form.logo,
        accreditation: form.accreditation,
        isoStandards: form.isoStandards,
        notes: form.notes,
        established: form.established,
      },
    };

    try {
      const updated = await api.put<IOrganization>(`/admin/organizations/${org.id}`, payload);
      setOrg({ ...updated, id: (updated as any)._id });
      toast.success('Organization updated');
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update organization');
    }
  };

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

  if (!org) {
    return (
      <PageWrapper>
        <PageHeader title="Organization" description="Your organization's profile, contact information and compliance standards." />
        <Card className="p-8 max-w-4xl">
          <p className="text-sm text-muted-foreground">No organization record found.</p>
        </Card>
      </PageWrapper>
    );
  }

  const settings = org.settings || {};
  const industryLabel = INDUSTRY_OPTS.find((i) => i.value === org.industry)?.label || org.industry;
  const addressLine = [settings.address1 ?? org.address, settings.address2, settings.city, settings.state, settings.postal].filter(Boolean).join(', ');

  return (
    <PageWrapper>
      <PageHeader title="Organization" description="Your organization's profile, contact information and compliance standards."
        action={<Button variant="accent" onClick={openEdit}><Pencil className="h-4 w-4" /> Edit Organization</Button>} />

      <Card className="p-8 max-w-4xl">
        <div className="flex items-start gap-5 mb-6 pb-6 border-b">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{org.name}</h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className="bg-accent/15 text-accent-foreground dark:text-accent border-accent/30">{industryLabel}</Badge>
              <span className="text-xs font-mono text-muted-foreground">{org.orgId}</span>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Established {formatDate(org.createdAt)}</span>
              <Badge className={org.isActive ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-secondary text-muted-foreground'}>
                {org.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {[
            { icon: MapPin, label: 'Address', value: addressLine || '—' },
            { icon: Globe, label: 'Country', value: COUNTRY_OPTS.find((c) => c.value === settings.country)?.label || '—' },
            { icon: Phone, label: 'Phone', value: org.contactPhone || '—' },
            { icon: Mail, label: 'Email', value: org.contactEmail || '—' },
            { icon: Globe, label: 'Website', value: settings.website || '—' },
            { icon: Building2, label: 'Accreditation', value: settings.accreditation || '—' },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">{item.label}</p>
                <p className="text-sm text-foreground truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {(settings.isoStandards?.length > 0) && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">ISO Standards</p>
            <div className="flex flex-wrap gap-1.5">
              {(settings.isoStandards || []).map((s: string) => (
                <Badge key={s} className="bg-primary/10 text-primary border-primary/20">{ISO_OPTS.find((i) => i.value === s)?.label || s}</Badge>
              ))}
            </div>
          </div>
        )}

        {settings.notes && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Notes</p>
            <p className="text-sm">{settings.notes}</p>
          </div>
        )}
      </Card>

      <Sheet open={editing} onOpenChange={setEditing} className="!w-[640px]">
        <SheetHeader>
          <SheetTitle>Edit Organization</SheetTitle>
          <SheetDescription>Update your organization profile, address, contact details and compliance.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <ConfigForm fields={ORG_FIELDS} value={form} onChange={setForm} errors={errs} />
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          <Button variant="accent" onClick={save}>Save Changes</Button>
        </SheetFooter>
      </Sheet>
    </PageWrapper>
  );
};
