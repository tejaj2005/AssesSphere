/**
 * Field configurations for every entity edit form.
 * Each function returns a FieldDef[] suitable for <ConfigForm fields={...} />
 *
 * Pass dynamic options (materials, suppliers, etc.) via the helper params.
 */
import type { FieldDef } from '@/components/shared/ConfigForm';

// ─── INSPECTION METHOD ───
export const inspectionMethodFields = (equipment: { id: string; name: string }[], users: { id: string; name: string }[]): FieldDef[] => [
  { section: 'Identity',    name: 'name',          label: 'Method Name', type: 'text', required: true, col: 'half' },
  {                         name: 'code',          label: 'Method Code', type: 'text', col: 'half' },
  {                         name: 'methodType',    label: 'Method Type', type: 'select', col: 'half',
                            options: [{ label: 'Chemical / Analytical', value: 'CHEMICAL' }, { label: 'Physical', value: 'PHYSICAL' }, { label: 'Microbiological', value: 'MICROBIO' }, { label: 'Sensory / Visual', value: 'SENSORY' }, { label: 'Non-Destructive Testing', value: 'NDT' }, { label: 'Instrumentive', value: 'INSTRUMENTIVE' }] },
  {                         name: 'referenceStandard', label: 'Reference Standard', type: 'text', col: 'half', placeholder: 'e.g. ISO 6887' },
  {                         name: 'description',   label: 'Description', type: 'textarea' },

  { section: 'Configuration', name: 'equipmentIds',    label: 'Equipment Required', type: 'multi-select', options: equipment.map((e) => ({ label: e.name, value: e.id })) },
  {                           name: 'sampleSize',      label: 'Sample Size', type: 'text', col: 'half' },
  {                           name: 'acceptanceCriteria', label: 'Acceptance Criteria', type: 'textarea' },

  { section: 'Approval',    name: 'approvalStatus', label: 'Approval Status', type: 'select', col: 'half',
                            options: [{ label: 'Draft', value: 'DRAFT' }, { label: 'Under Review', value: 'REVIEW' }, { label: 'Approved', value: 'APPROVED' }] },
  {                         name: 'approvedById',  label: 'Approved By', type: 'select', col: 'half',
                            options: [{ label: '— None —', value: '' }, ...users.map((u) => ({ label: u.name, value: u.id }))] },
  {                         name: 'effectiveDate', label: 'Effective Date', type: 'date', col: 'half' },
  {                         name: 'sopFile',       label: 'Attached SOP', type: 'file', col: 'half' },
];

// ─── SUPPLIER ───
export const supplierFields = (materials: { id: string; name: string }[]): FieldDef[] => [
  { section: 'Identity',    name: 'name',          label: 'Supplier Name', type: 'text', required: true, col: 'half' },
  {                         name: 'code',          label: 'Supplier Code', type: 'text', col: 'half' },
  {                         name: 'supplierCategory', label: 'Supplier Category', type: 'select', col: 'half',
                            options: [{ label: 'Approved', value: 'APPROVED' }, { label: 'Conditional', value: 'CONDITIONAL' }, { label: 'Blacklisted', value: 'BLACKLISTED' }] },
  {                         name: 'country',       label: 'Country', type: 'select', col: 'half',
                            options: [{ label: 'India', value: 'IN' }, { label: 'United States', value: 'US' }, { label: 'Germany', value: 'DE' }, { label: 'Japan', value: 'JP' }, { label: 'China', value: 'CN' }, { label: 'Singapore', value: 'SG' }] },

  { section: 'Contact',     name: 'contactPerson', label: 'Contact Person', type: 'text', col: 'half' },
  {                         name: 'email',         label: 'Email', type: 'email', col: 'half' },
  {                         name: 'phone',         label: 'Phone', type: 'tel', col: 'half' },
  {                         name: 'paymentTerms',  label: 'Payment Terms', type: 'text', col: 'half', placeholder: 'e.g. Net 30' },
  {                         name: 'address',       label: 'Address', type: 'textarea' },

  { section: 'Performance', name: 'certification', label: 'Certification (ISO etc.)', type: 'text', col: 'half', placeholder: 'e.g. ISO 9001:2015' },
  {                         name: 'leadTime',      label: 'Lead Time (days)', type: 'number', col: 'half' },
  {                         name: 'rating',        label: 'Rating', type: 'rating', col: 'half' },
  {                         name: 'status',        label: 'Active', type: 'toggle', col: 'half' },
  {                         name: 'materialIds',   label: 'Materials Supplied', type: 'multi-select', options: materials.map((m) => ({ label: m.name, value: m.id })) },

  { section: 'Documents',   name: 'attachments',   label: 'Attached Documents', type: 'file' },
  {                         name: 'notes',         label: 'Notes', type: 'textarea' },
];
