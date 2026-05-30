/**
 * Field configurations for every entity edit form.
 * Each function returns a FieldDef[] suitable for <ConfigForm fields={...} />
 *
 * Pass dynamic options (materials, suppliers, etc.) via the helper params.
 */
import type { FieldDef, FieldOption } from '@/components/shared/ConfigForm';

const UOM_OPTS: FieldOption[] = [
  { label: 'kilograms (kg)', value: 'kg' },
  { label: 'pieces (pcs)',   value: 'pcs' },
  { label: 'liters (L)',     value: 'L' },
  { label: 'meters (m)',     value: 'm' },
  { label: 'grams (g)',      value: 'g' },
];

// ─── COMPONENT ───
export const componentFields = (products: { id: string; name: string }[], suppliers: { id: string; name: string }[]): FieldDef[] => [
  { section: 'Basic',       name: 'name',          label: 'Component Name', type: 'text', required: true, col: 'half' },
  {                         name: 'code',          label: 'Component Code', type: 'text', required: true, col: 'half' },
  {                         name: 'componentType', label: 'Component Type', type: 'select', col: 'half',
                            options: [{ label: 'Raw Material', value: 'RAW' }, { label: 'Sub-assembly', value: 'SUB_ASSEMBLY' }, { label: 'Consumable', value: 'CONSUMABLE' }] },
  {                         name: 'uom',           label: 'Unit of Measure', type: 'select', col: 'half', options: UOM_OPTS },
  {                         name: 'productId',     label: 'Parent Product', type: 'select', required: true, col: 'half',
                            options: products.map((p) => ({ label: p.name, value: p.id })) },
  {                         name: 'supplierId',    label: 'Default Supplier', type: 'select', col: 'half',
                            options: [{ label: '— None —', value: '' }, ...suppliers.map((s) => ({ label: s.name, value: s.id }))] },

  { section: 'Inventory',   name: 'minimumStock',  label: 'Minimum Stock',    type: 'number', col: 'third' },
  {                         name: 'leadTime',      label: 'Lead Time (days)', type: 'number', col: 'third' },
  {                         name: 'certificate',   label: 'Certificate Required', type: 'toggle', col: 'third' },
  {                         name: 'storage',       label: 'Storage Requirements', type: 'text' },
  {                         name: 'qualityStandard', label: 'Quality Standard', type: 'text', placeholder: 'e.g. ISO 9001 §8.4' },
  {                         name: 'notes',         label: 'Notes', type: 'textarea' },
];

// ─── MANUFACTURING / ASSEMBLING STAGE ───
export const stageFields = (products: { id: string; name: string }[], departments: { id: string; name: string }[], equipment: { id: string; name: string }[]): FieldDef[] => [
  { section: 'Basic',       name: 'name',           label: 'Stage Name', type: 'text', required: true, col: 'half' },
  {                         name: 'code',           label: 'Stage Code', type: 'text', col: 'half' },
  {                         name: 'order',          label: 'Sequence Order', type: 'number', col: 'half' },
  {                         name: 'productId',      label: 'Linked Product', type: 'select', col: 'half',
                            options: [{ label: '— Any —', value: '' }, ...products.map((p) => ({ label: p.name, value: p.id }))] },
  {                         name: 'departmentId',   label: 'Responsible Department', type: 'select', col: 'half',
                            options: [{ label: '— None —', value: '' }, ...departments.map((d) => ({ label: d.name, value: d.id }))] },
  {                         name: 'role',           label: 'Responsible Role', type: 'select', col: 'half',
                            options: [{ label: 'Production Manager', value: 'PM' }, { label: 'Quality Manager', value: 'QM' }, { label: 'Operator', value: 'OPERATOR' }] },
  {                         name: 'duration',       label: 'Estimated Duration (hrs)', type: 'number', col: 'half' },
  {                         name: 'sopRef',         label: 'SOP Reference', type: 'text', col: 'half', placeholder: 'e.g. SOP-MFG-01' },

  { section: 'Configuration', name: 'equipmentIds',     label: 'Equipment Required', type: 'multi-select', options: equipment.map((e) => ({ label: e.name, value: e.id })) },
  {                           name: 'criticalPoint',    label: 'Critical Control Point', type: 'toggle', col: 'half' },
  {                           name: 'inspectionRequired', label: 'Inspection Required', type: 'toggle', col: 'half' },
  {                           name: 'notes',            label: 'Notes', type: 'textarea' },
];

// ─── INSPECTION TYPE ───
export const inspectionTypeFields = (products: { id: string; name: string }[], stages: { id: string; name: string }[]): FieldDef[] => [
  { section: 'Identity',    name: 'name',          label: 'Inspection Type Name', type: 'text', required: true, col: 'half' },
  {                         name: 'code',          label: 'Code', type: 'text', col: 'half' },
  {                         name: 'category',      label: 'Category', type: 'select', col: 'half',
                            options: [{ label: 'Incoming', value: 'INCOMING' }, { label: 'In-process', value: 'IN_PROCESS' }, { label: 'Final', value: 'FINAL' }, { label: 'Periodic', value: 'PERIODIC' }] },
  {                         name: 'frequency',     label: 'Default Frequency', type: 'select', col: 'half',
                            options: [{ label: 'Per Batch', value: 'PER_BATCH' }, { label: 'Daily', value: 'DAILY' }, { label: 'Weekly', value: 'WEEKLY' }, { label: 'On-demand', value: 'ON_DEMAND' }] },
  {                         name: 'productIds',    label: 'Linked Products', type: 'multi-select', options: products.map((p) => ({ label: p.name, value: p.id })) },
  {                         name: 'stageIds',      label: 'Linked Stages',   type: 'multi-select', options: stages.map((s) => ({ label: s.name, value: s.id })) },
  {                         name: 'regulatory',    label: 'Regulatory Requirement', type: 'toggle', col: 'half' },
  {                         name: 'status',        label: 'Active', type: 'toggle', col: 'half' },
  {                         name: 'criteria',      label: 'Pass / Fail Criteria', type: 'textarea' },
  {                         name: 'requiredDocs',  label: 'Required Documents', type: 'text' },
];

// ─── EQUIPMENT ───
export const equipmentFields = (departments: { id: string; name: string }[], inspectionTypes: { id: string; name: string }[]): FieldDef[] => [
  { section: 'Identity',    name: 'name',          label: 'Equipment Name', type: 'text', required: true, col: 'half' },
  {                         name: 'assetTag',      label: 'Asset Tag / ID',  type: 'text', col: 'half' },
  {                         name: 'code',          label: 'Equipment Code',  type: 'text', col: 'half' },
  {                         name: 'equipmentType', label: 'Equipment Type', type: 'select', col: 'half',
                            options: [{ label: 'Measuring', value: 'MEASURING' }, { label: 'Production', value: 'PRODUCTION' }, { label: 'Testing', value: 'TESTING' }, { label: 'Calibration', value: 'CALIBRATION' }] },
  {                         name: 'departmentId',  label: 'Department', type: 'select', col: 'half',
                            options: [{ label: '— None —', value: '' }, ...departments.map((d) => ({ label: d.name, value: d.id }))] },
  {                         name: 'location',      label: 'Location', type: 'text', col: 'half' },

  { section: 'Vendor',      name: 'supplier',      label: 'Manufacturer / Supplier', type: 'text', required: true, col: 'half' },
  {                         name: 'modelNumber',   label: 'Model Number', type: 'text', col: 'half' },
  {                         name: 'serialNumber',  label: 'Serial Number', type: 'text', col: 'half' },
  {                         name: 'purchaseDate',  label: 'Purchase Date', type: 'date', col: 'half' },

  { section: 'Calibration', name: 'calibrationDueDate', label: 'Calibration Due Date', type: 'date', col: 'half' },
  {                         name: 'calibrationFrequency', label: 'Calibration Frequency', type: 'select', col: 'half',
                            options: [{ label: 'Monthly', value: 'MONTHLY' }, { label: 'Quarterly', value: 'QUARTERLY' }, { label: 'Bi-annually', value: 'BIANNUAL' }, { label: 'Annually', value: 'ANNUAL' }] },
  {                         name: 'calibrationStatus', label: 'Calibration Status', type: 'select', col: 'half',
                            options: [{ label: 'Completed', value: 'COMPLETED' }, { label: 'Pending', value: 'PENDING' }] },
  {                         name: 'condition',     label: 'Condition', type: 'select', col: 'half',
                            options: [{ label: 'Good', value: 'GOOD' }, { label: 'Needs Service', value: 'SERVICE' }, { label: 'Out of Order', value: 'OUT_OF_ORDER' }] },
  {                         name: 'inspectionTypeIds', label: 'Linked Inspection Types', type: 'multi-select', options: inspectionTypes.map((t) => ({ label: t.name, value: t.id })) },

  { section: 'Documents',   name: 'manuals',       label: 'Attached Manuals', type: 'file' },
  {                         name: 'notes',         label: 'Notes', type: 'textarea' },
];

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

// ─── MATERIAL TYPE ───
export const materialTypeFields: FieldDef[] = [
  { section: 'Identity',    name: 'name',          label: 'Material Type Name', type: 'text', required: true, col: 'half' },
  {                         name: 'code',          label: 'Code', type: 'text', col: 'half' },
  {                         name: 'regulatoryClass', label: 'Regulatory Class', type: 'select', col: 'half',
                            options: [{ label: 'General', value: 'GENERAL' }, { label: 'Hazardous', value: 'HAZ' }, { label: 'Controlled', value: 'CONTROLLED' }, { label: 'Pharmaceutical Grade', value: 'PHARMA' }] },
  {                         name: 'storageTemperature', label: 'Storage Temperature', type: 'text', col: 'half', placeholder: 'e.g. 15–25°C' },
  {                         name: 'handlingRequirements', label: 'Handling Requirements', type: 'text' },
  {                         name: 'description',   label: 'Description', type: 'textarea' },
  {                         name: 'status',        label: 'Active', type: 'toggle' },
];

// ─── MATERIAL ───
export const materialFields = (types: { id: string; name: string }[], suppliers: { id: string; name: string }[]): FieldDef[] => [
  { section: 'Identity',    name: 'name',          label: 'Material Name', type: 'text', required: true, col: 'half' },
  {                         name: 'code',          label: 'Material Code', type: 'text', required: true, col: 'half' },
  {                         name: 'materialTypeId', label: 'Material Type', type: 'select', required: true, col: 'half',
                            options: types.map((t) => ({ label: t.name, value: t.id })) },
  {                         name: 'uom',           label: 'Unit of Measure', type: 'select', col: 'half', options: UOM_OPTS },
  {                         name: 'grade',         label: 'Grade / Purity', type: 'text', col: 'half', placeholder: 'e.g. 99.5%' },
  {                         name: 'casNumber',     label: 'CAS Number', type: 'text', col: 'half', placeholder: 'e.g. 7440-66-6' },
  {                         name: 'supplierIds',   label: 'Linked Suppliers', type: 'multi-select', options: suppliers.map((s) => ({ label: s.name, value: s.id })) },

  { section: 'Inventory',   name: 'minimumStock',  label: 'Minimum Stock', type: 'number', col: 'third' },
  {                         name: 'reorderPoint',  label: 'Reorder Point', type: 'number', col: 'third' },
  {                         name: 'leadTime',      label: 'Lead Time (days)', type: 'number', col: 'third' },
  {                         name: 'shelfLife',     label: 'Shelf Life (days)', type: 'number', col: 'half' },
  {                         name: 'msdsAvailable', label: 'MSDS Available', type: 'toggle', col: 'half' },
  {                         name: 'storageConditions', label: 'Storage Conditions', type: 'text' },

  { section: 'Status',      name: 'status',        label: 'Active', type: 'toggle' },
  {                         name: 'notes',         label: 'Notes', type: 'textarea' },
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
