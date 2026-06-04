import { useState } from 'react';
import { Building2, Pencil, Calendar, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetHeader, SheetTitle, SheetBody, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { ConfigForm, FieldDef, validateConfigForm } from '@/components/shared/ConfigForm';
import { useData } from '@/context/DataContext';
import { formatDate } from '@/lib/utils';

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
  {                       name: 'code',     label: 'Organization Code', type: 'text', col: 'half', placeholder: 'e.g. ORG-001' },
  {                       name: 'type',     label: 'Industry / Sector', type: 'select', required: true, options: INDUSTRY_OPTS, col: 'half' },
  {                       name: 'established', label: 'Date Established', type: 'date', col: 'half' },

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

export const OrganizationPage = () => {
  const { organization, updateOrganization } = useData();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>(organization);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const openEdit = () => {
    setForm({ ...organization, isoStandards: (organization as any).isoStandards || [] });
    setErrs({});
    setEditing(true);
  };

  const save = () => {
    const v = validateConfigForm(ORG_FIELDS, form);
    if (!v.valid) { setErrs(v.errors); toast.error('Please fix form errors'); return; }
    updateOrganization(form as any);
    toast.success('Organization updated');
    setEditing(false);
  };

  const industryLabel = INDUSTRY_OPTS.find((i) => i.value === organization.type)?.label || organization.type;

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
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{organization.name}</h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className="bg-accent/15 text-accent-foreground dark:text-accent border-accent/30">{industryLabel}</Badge>
              <span className="text-xs font-mono text-muted-foreground">{(organization as any).code || organization.id}</span>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Established {formatDate(organization.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {[
            { icon: MapPin, label: 'Address', value: [(organization as any).address1, (organization as any).address2, (organization as any).city, (organization as any).state, (organization as any).postal].filter(Boolean).join(', ') || '—' },
            { icon: Globe, label: 'Country', value: COUNTRY_OPTS.find((c) => c.value === (organization as any).country)?.label || '—' },
            { icon: Phone, label: 'Phone', value: (organization as any).phone || '—' },
            { icon: Mail, label: 'Email', value: (organization as any).email || '—' },
            { icon: Globe, label: 'Website', value: (organization as any).website || '—' },
            { icon: Building2, label: 'Accreditation', value: (organization as any).accreditation || '—' },
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

        {((organization as any).isoStandards?.length > 0) && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">ISO Standards</p>
            <div className="flex flex-wrap gap-1.5">
              {((organization as any).isoStandards || []).map((s: string) => (
                <Badge key={s} className="bg-primary/10 text-primary border-primary/20">{ISO_OPTS.find((i) => i.value === s)?.label || s}</Badge>
              ))}
            </div>
          </div>
        )}

        {(organization as any).notes && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Notes</p>
            <p className="text-sm">{(organization as any).notes}</p>
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
