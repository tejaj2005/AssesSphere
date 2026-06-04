import type { FieldDef } from '@/components/shared/ConfigForm';

interface StageOpt { id: string; name: string; }

export const PRODUCT_INITIAL_FORM: Record<string, any> = {
  name: '', code: '', category: '', description: '', uom: 'pcs', batchSize: '', shelfLife: '',
  storageConditions: '', regulatoryClass: '', drawingRef: '', attachments: [], status: true, notes: '',
  manufacturingStageIds: [] as string[], assemblingStageIds: [] as string[],
};

export const buildProductFields = (mfgStages: StageOpt[], asmStages: StageOpt[]): FieldDef[] => [
  { section: 'Basic Information', name: 'name', label: 'Product Name', type: 'text', required: true, col: 'half' },
  {                               name: 'code', label: 'Product Code', type: 'text', required: true, col: 'half', help: 'Must be unique' },
  {                               name: 'category', label: 'Product Category', type: 'select', col: 'half',
                                  options: [{ label: 'Mechanical Assembly', value: 'MECHANICAL' }, { label: 'Electronics', value: 'ELECTRONICS' }, { label: 'Sub-assembly', value: 'SUBASSEMBLY' }, { label: 'Raw Material', value: 'RAW' }] },
  {                               name: 'uom',  label: 'Unit of Measure', type: 'select', col: 'half',
                                  options: [{ label: 'kg', value: 'kg' }, { label: 'pcs', value: 'pcs' }, { label: 'L (liters)', value: 'L' }, { label: 'm (meters)', value: 'm' }] },
  {                               name: 'description', label: 'Description', type: 'textarea' },

  { section: 'Specifications', name: 'batchSize', label: 'Standard Batch Size', type: 'number', col: 'half' },
  {                            name: 'shelfLife', label: 'Shelf Life (days)', type: 'number', col: 'half' },
  {                            name: 'storageConditions', label: 'Storage Conditions', type: 'text', col: 'half', placeholder: 'e.g. 15–25°C, dry' },
  {                            name: 'regulatoryClass', label: 'Regulatory Class', type: 'select', col: 'half',
                               options: [{ label: 'General', value: 'GENERAL' }, { label: 'Medical Device', value: 'MEDICAL' }, { label: 'Pharmaceutical', value: 'PHARMA' }, { label: 'Hazardous', value: 'HAZ' }] },
  {                            name: 'drawingRef', label: 'Drawing / Spec Reference', type: 'text', col: 'half', placeholder: 'e.g. DWG-001' },
  {                            name: 'status', label: 'Active', type: 'toggle', col: 'half' },

  { section: 'Stages', name: 'manufacturingStageIds', label: 'Manufacturing Stages', type: 'multi-select', options: mfgStages.map((s) => ({ label: s.name, value: s.id })) },
  {                    name: 'assemblingStageIds',    label: 'Assembling Stages',    type: 'multi-select', options: asmStages.map((s) => ({ label: s.name, value: s.id })) },

  { section: 'Attachments', name: 'attachments', label: 'Attached Documents', type: 'file' },
  {                         name: 'notes', label: 'Notes', type: 'textarea' },
];
