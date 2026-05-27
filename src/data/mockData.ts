import type {
  Organization, Department, Role, User, Product, ProductComponent,
  ManufacturingStage, AssemblingStage, InspectionType, InspectionEquipment,
  InspectionMethod, MfgDocument, Material, MaterialType, Supplier,
  SupplierEvalMethod, AuditLogEntry,
} from '@/types';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600000).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export const ALL_PAGES = [
  'Dashboard', 'Organization', 'Departments', 'Users', 'Roles', 'Products',
  'Components', 'Manufacturing Stages', 'Assembling Stages', 'Inspection Types',
  'Equipment', 'Inspection Methods', 'Documents', 'Materials', 'Material Types',
  'Suppliers',
];

const allPerm = (v: boolean) => ALL_PAGES.reduce((acc, p) => {
  acc[p] = { view: v, create: v, edit: v, delete: v };
  return acc;
}, {} as Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>);

const viewOnly = () => ALL_PAGES.reduce((acc, p) => {
  acc[p] = { view: true, create: false, edit: false, delete: false };
  return acc;
}, {} as Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>);

const inspectorPerm = () => {
  const p = viewOnly();
  ['Equipment', 'Inspection Methods'].forEach((k) => (p[k] = { view: true, create: false, edit: true, delete: false }));
  return p;
};

export const initialOrganization: Organization = {
  id: 'ORG-001',
  name: 'Precision Parts Pvt. Ltd.',
  type: 'ENGINEERING',
  createdAt: daysAgo(540),
};

export const initialDepartments: Department[] = [
  { id: 'DEPT-001', name: 'Production', status: 'Active', createdAt: daysAgo(500) },
  { id: 'DEPT-002', name: 'Quality Control', status: 'Active', createdAt: daysAgo(500) },
  { id: 'DEPT-003', name: 'Stores', status: 'Active', createdAt: daysAgo(490) },
  { id: 'DEPT-004', name: 'Assembly', status: 'Active', createdAt: daysAgo(485) },
  { id: 'DEPT-005', name: 'Engineering', status: 'Active', createdAt: daysAgo(480) },
  { id: 'DEPT-006', name: 'Research & Development', status: 'Active', createdAt: daysAgo(420) },
  { id: 'DEPT-007', name: 'Maintenance', status: 'Active', createdAt: daysAgo(400) },
  { id: 'DEPT-008', name: 'Logistics', status: 'Inactive', createdAt: daysAgo(350) },
];

export const initialRoles: Role[] = [
  { id: 'ROLE-001', name: 'Admin', description: 'Full system access and configuration', isSystem: true, permissions: allPerm(true) },
  { id: 'ROLE-002', name: 'Management', description: 'Read-only access to all modules with insights', isSystem: true, permissions: viewOnly() },
  { id: 'ROLE-003', name: 'Production Manager', description: 'Manages products, components and manufacturing stages', isSystem: true, permissions: { ...viewOnly(), Products: { view: true, create: true, edit: true, delete: false }, Components: { view: true, create: true, edit: true, delete: false }, 'Manufacturing Stages': { view: true, create: true, edit: true, delete: false } } },
  { id: 'ROLE-004', name: 'Stores Manager', description: 'Manages materials and supplier relationships', isSystem: true, permissions: { ...viewOnly(), Materials: { view: true, create: true, edit: true, delete: false }, 'Material Types': { view: true, create: true, edit: true, delete: false }, Suppliers: { view: true, create: true, edit: true, delete: false } } },
  { id: 'ROLE-005', name: 'Quality Manager', description: 'Manages quality inspection workflows', isSystem: true, permissions: { ...viewOnly(), 'Inspection Types': { view: true, create: true, edit: true, delete: false }, Equipment: { view: true, create: true, edit: true, delete: false }, 'Inspection Methods': { view: true, create: true, edit: true, delete: false }, Documents: { view: true, create: true, edit: true, delete: false } } },
  { id: 'ROLE-006', name: 'Inspector', description: 'Performs inspections and equipment monitoring', isSystem: true, permissions: inspectorPerm() },
];

export const initialUsers: User[] = [
  { id: 'U-001', employeeId: 'EMP-001', name: 'Priya Sharma',   email: 'priya@pqas.com',    roleId: 'ROLE-001', departmentId: 'DEPT-005', status: 'Active', createdAt: daysAgo(540) },
  { id: 'U-002', employeeId: 'EMP-002', name: 'Arjun Mehta',    email: 'arjun@pqas.com',    roleId: 'ROLE-002', departmentId: 'DEPT-005', status: 'Active', createdAt: daysAgo(520) },
  { id: 'U-003', employeeId: 'EMP-003', name: 'Suresh Kumar',   email: 'suresh@pqas.com',   roleId: 'ROLE-003', departmentId: 'DEPT-001', status: 'Active', createdAt: daysAgo(500) },
  { id: 'U-004', employeeId: 'EMP-004', name: 'Kavitha Nair',   email: 'kavitha@pqas.com',  roleId: 'ROLE-004', departmentId: 'DEPT-003', status: 'Active', createdAt: daysAgo(480) },
  { id: 'U-005', employeeId: 'EMP-005', name: 'Deepa Reddy',    email: 'deepa@pqas.com',    roleId: 'ROLE-005', departmentId: 'DEPT-002', status: 'Active', createdAt: daysAgo(450) },
  { id: 'U-006', employeeId: 'EMP-006', name: 'Ravi Patel',     email: 'ravi@pqas.com',     roleId: 'ROLE-006', departmentId: 'DEPT-001', status: 'Active', createdAt: daysAgo(400) },
  { id: 'U-007', employeeId: 'EMP-007', name: 'Priya Das',      email: 'priyadv@pqas.com',  roleId: 'ROLE-006', departmentId: 'DEPT-004', status: 'Active', createdAt: daysAgo(380) },
  { id: 'U-008', employeeId: 'EMP-008', name: 'Mohammed Yusuf', email: 'mohammed@pqas.com', roleId: 'ROLE-006', departmentId: 'DEPT-002', status: 'Active', createdAt: daysAgo(350) },
  { id: 'U-009', employeeId: 'EMP-009', name: 'Anita Krishnan', email: 'anita@pqas.com',    roleId: 'ROLE-003', departmentId: 'DEPT-004', status: 'Active', createdAt: daysAgo(300) },
  { id: 'U-010', employeeId: 'EMP-010', name: 'Vikram Singh',   email: 'vikram@pqas.com',   roleId: 'ROLE-006', departmentId: 'DEPT-002', status: 'Active', createdAt: daysAgo(280) },
  { id: 'U-011', employeeId: 'EMP-011', name: 'Sneha Iyer',     email: 'sneha@pqas.com',    roleId: 'ROLE-005', departmentId: 'DEPT-002', status: 'Active', createdAt: daysAgo(240) },
  { id: 'U-012', employeeId: 'EMP-012', name: 'Rahul Verma',    email: 'rahul@pqas.com',    roleId: 'ROLE-004', departmentId: 'DEPT-003', status: 'Active', createdAt: daysAgo(220) },
  { id: 'U-013', employeeId: 'EMP-013', name: 'Lakshmi Rao',    email: 'lakshmi@pqas.com',  roleId: 'ROLE-006', departmentId: 'DEPT-001', status: 'Active', createdAt: daysAgo(200) },
  { id: 'U-014', employeeId: 'EMP-014', name: 'Nikhil Joshi',   email: 'nikhil@pqas.com',   roleId: 'ROLE-006', departmentId: 'DEPT-004', status: 'Active', createdAt: daysAgo(180) },
  { id: 'U-015', employeeId: 'EMP-015', name: 'Pooja Bhat',     email: 'pooja@pqas.com',    roleId: 'ROLE-002', departmentId: 'DEPT-006', status: 'Active', createdAt: daysAgo(160) },
  { id: 'U-016', employeeId: 'EMP-016', name: 'Karthik Menon',  email: 'karthik@pqas.com',  roleId: 'ROLE-006', departmentId: 'DEPT-002', status: 'Inactive', createdAt: daysAgo(140) },
  { id: 'U-017', employeeId: 'EMP-017', name: 'Divya Kapoor',   email: 'divya@pqas.com',    roleId: 'ROLE-003', departmentId: 'DEPT-001', status: 'Active', createdAt: daysAgo(120) },
  { id: 'U-018', employeeId: 'EMP-018', name: 'Sandeep Roy',    email: 'sandeep@pqas.com',  roleId: 'ROLE-006', departmentId: 'DEPT-007', status: 'Active', createdAt: daysAgo(100) },
  { id: 'U-019', employeeId: 'EMP-019', name: 'Meera Pillai',   email: 'meera@pqas.com',    roleId: 'ROLE-005', departmentId: 'DEPT-002', status: 'Active', createdAt: daysAgo(80) },
  { id: 'U-020', employeeId: 'EMP-020', name: 'Aditya Shah',    email: 'aditya@pqas.com',   roleId: 'ROLE-001', departmentId: 'DEPT-005', status: 'Active', createdAt: daysAgo(60) },
];

export const initialManufacturingStages: ManufacturingStage[] = [
  { id: 'MFG-001', name: 'Machining', order: 1 },
  { id: 'MFG-002', name: 'Heat Treatment', order: 2 },
  { id: 'MFG-003', name: 'Grinding', order: 3 },
  { id: 'MFG-004', name: 'CNC Turning', order: 4 },
  { id: 'MFG-005', name: 'Surface Finishing', order: 5 },
  { id: 'MFG-006', name: 'PCB Assembly', order: 6 },
  { id: 'MFG-007', name: 'Wiring', order: 7 },
  { id: 'MFG-008', name: 'Coating', order: 8 },
  { id: 'MFG-009', name: 'Welding', order: 9 },
  { id: 'MFG-010', name: 'Quality Control', order: 10 },
];

export const initialAssemblingStages: AssemblingStage[] = [
  { id: 'ASM-001', name: 'Sub-Assembly', order: 1 },
  { id: 'ASM-002', name: 'Final Assembly', order: 2 },
  { id: 'ASM-003', name: 'Enclosure Assembly', order: 3 },
  { id: 'ASM-004', name: 'Testing', order: 4 },
  { id: 'ASM-005', name: 'Packaging', order: 5 },
  { id: 'ASM-006', name: 'Labeling', order: 6 },
];

export const initialProducts: Product[] = [
  { id: 'PROD-001', name: 'GearBox Assembly GX-200', code: 'GX-200', manufacturingStageIds: ['MFG-001', 'MFG-002', 'MFG-003'],          assemblingStageIds: ['ASM-001', 'ASM-002'], createdAt: daysAgo(180) },
  { id: 'PROD-002', name: 'Shaft Unit SH-400',       code: 'SH-400', manufacturingStageIds: ['MFG-004', 'MFG-005'],                     assemblingStageIds: ['ASM-002'],            createdAt: daysAgo(150) },
  { id: 'PROD-003', name: 'Control Panel CP-100',    code: 'CP-100', manufacturingStageIds: ['MFG-006', 'MFG-007'],                     assemblingStageIds: ['ASM-003', 'ASM-004'], createdAt: daysAgo(120) },
  { id: 'PROD-004', name: 'Hydraulic Pump HP-500',   code: 'HP-500', manufacturingStageIds: ['MFG-001', 'MFG-002', 'MFG-005'],          assemblingStageIds: ['ASM-001', 'ASM-004'], createdAt: daysAgo(90) },
  { id: 'PROD-005', name: 'Motor Housing MH-300',    code: 'MH-300', manufacturingStageIds: ['MFG-001', 'MFG-008'],                     assemblingStageIds: ['ASM-005'],            createdAt: daysAgo(60) },
  { id: 'PROD-006', name: 'Drive Assembly DA-700',   code: 'DA-700', manufacturingStageIds: ['MFG-004', 'MFG-003', 'MFG-009'],          assemblingStageIds: ['ASM-001', 'ASM-002', 'ASM-006'], createdAt: daysAgo(40) },
  { id: 'PROD-007', name: 'Sensor Module SM-50',     code: 'SM-50',  manufacturingStageIds: ['MFG-006', 'MFG-007', 'MFG-010'],          assemblingStageIds: ['ASM-003', 'ASM-004'], createdAt: daysAgo(20) },
];

export const initialComponents: ProductComponent[] = [
  { id: 'COMP-001', name: 'Gear Ring',         code: 'CMP-GR-01', productId: 'PROD-001', createdAt: daysAgo(180) },
  { id: 'COMP-002', name: 'Input Shaft',       code: 'CMP-IS-01', productId: 'PROD-001', createdAt: daysAgo(180) },
  { id: 'COMP-003', name: 'Housing',           code: 'CMP-HS-01', productId: 'PROD-001', createdAt: daysAgo(178) },
  { id: 'COMP-004', name: 'Bearing Assembly',  code: 'CMP-BA-01', productId: 'PROD-001', createdAt: daysAgo(175) },
  { id: 'COMP-005', name: 'Main Shaft',        code: 'CMP-MS-01', productId: 'PROD-002', createdAt: daysAgo(150) },
  { id: 'COMP-006', name: 'Coupling',          code: 'CMP-CP-01', productId: 'PROD-002', createdAt: daysAgo(148) },
  { id: 'COMP-007', name: 'Circuit Board',     code: 'CMP-CB-01', productId: 'PROD-003', createdAt: daysAgo(120) },
  { id: 'COMP-008', name: 'Enclosure',         code: 'CMP-EN-01', productId: 'PROD-003', createdAt: daysAgo(118) },
  { id: 'COMP-009', name: 'Display Panel',     code: 'CMP-DP-01', productId: 'PROD-003', createdAt: daysAgo(115) },
  { id: 'COMP-010', name: 'Piston',            code: 'CMP-PT-01', productId: 'PROD-004', createdAt: daysAgo(90) },
  { id: 'COMP-011', name: 'Cylinder',          code: 'CMP-CY-01', productId: 'PROD-004', createdAt: daysAgo(88) },
  { id: 'COMP-012', name: 'Seal Kit',          code: 'CMP-SK-01', productId: 'PROD-004', createdAt: daysAgo(85) },
  { id: 'COMP-013', name: 'Outer Casing',      code: 'CMP-OC-01', productId: 'PROD-005', createdAt: daysAgo(60) },
  { id: 'COMP-014', name: 'Mounting Plate',    code: 'CMP-MP-01', productId: 'PROD-005', createdAt: daysAgo(58) },
  { id: 'COMP-015', name: 'Drive Shaft',       code: 'CMP-DS-01', productId: 'PROD-006', createdAt: daysAgo(40) },
  { id: 'COMP-016', name: 'Sprocket',          code: 'CMP-SP-01', productId: 'PROD-006', createdAt: daysAgo(38) },
  { id: 'COMP-017', name: 'Sensor Chip',       code: 'CMP-SC-01', productId: 'PROD-007', createdAt: daysAgo(20) },
  { id: 'COMP-018', name: 'Connector Harness', code: 'CMP-CH-01', productId: 'PROD-007', createdAt: daysAgo(18) },
];

export const initialInspectionTypes: InspectionType[] = [
  { id: 'INSP-001', name: 'Incoming Material (Receiving)' },
  { id: 'INSP-002', name: 'First Article Inspection (FAI)' },
  { id: 'INSP-003', name: 'In-Process (Stage)' },
  { id: 'INSP-004', name: 'Final Inspection (Pre-Shipment)' },
  { id: 'INSP-005', name: 'Pre-Dispatch / Pre-Shipment' },
  { id: 'INSP-006', name: 'Visual Inspection' },
  { id: 'INSP-007', name: 'Dimensional Inspection' },
  { id: 'INSP-008', name: 'Functional / Performance Test' },
  { id: 'INSP-009', name: 'Non-Destructive Testing (NDT)' },
  { id: 'INSP-010', name: 'Destructive Testing' },
  { id: 'INSP-011', name: 'Sampling Inspection (AQL)' },
  { id: 'INSP-012', name: '100% Inspection' },
  { id: 'INSP-013', name: 'Process Audit' },
  { id: 'INSP-014', name: 'Safety / EHS Inspection' },
  { id: 'INSP-015', name: 'Regulatory / Compliance' },
  { id: 'INSP-016', name: 'Customer Return' },
];

export const initialInspectionMethods_extended = [
  { id: 'METH-001', name: 'Physical Test',          description: 'Mechanical & dimensional measurements using physical tools',                isSystem: true },
  { id: 'METH-002', name: 'Chemical / Analytical Test', description: 'Material composition, chemistry and spectral analysis',                  isSystem: true },
  { id: 'METH-003', name: 'Non-Destructive Test (NDT)', description: 'Ultrasonic, Radiographic, MPI, Dye Penetrant — tests without damage',    isSystem: true },
  { id: 'METH-004', name: 'Instrumentive Test',     description: 'Precision instrument-based measurements (CMM, profilometer, multimeter)',   isSystem: true },
  { id: 'METH-005', name: 'Visual / Observation',   description: 'Visual inspection and qualitative assessment',                                isSystem: true },
  { id: 'METH-006', name: 'Functional Test',        description: 'Validates equipment performs intended function',                              isSystem: false },
  { id: 'METH-007', name: 'Environmental Test',     description: 'Behavior under varying temperature and humidity',                             isSystem: false },
];

export const initialEquipment: InspectionEquipment[] = [
  { id: 'EQP-001', name: 'Rockwell Hardness Tester RH-01', code: 'RH-01', supplier: 'Mitutoyo',      calibrationStatus: 'COMPLETED', calibrationDueDate: daysAhead(90) },
  { id: 'EQP-002', name: 'Vernier Caliper VC-07',          code: 'VC-07', supplier: 'Starrett',      calibrationStatus: 'COMPLETED', calibrationDueDate: daysAhead(15) },
  { id: 'EQP-003', name: 'Micrometer MC-11',               code: 'MC-11', supplier: 'Mitutoyo',      calibrationStatus: 'PENDING',   calibrationDueDate: daysAhead(2) },
  { id: 'EQP-004', name: 'Profilometer PR-03',             code: 'PR-03', supplier: 'Taylor Hobson', calibrationStatus: 'COMPLETED', calibrationDueDate: daysAhead(120) },
  { id: 'EQP-005', name: 'Dial Gauge DG-04',               code: 'DG-04', supplier: 'Mitutoyo',      calibrationStatus: 'COMPLETED', calibrationDueDate: daysAhead(60) },
  { id: 'EQP-006', name: 'Spectrophotometer SP-02',        code: 'SP-02', supplier: 'Shimadzu',      calibrationStatus: 'PENDING',   calibrationDueDate: daysAhead(5) },
  { id: 'EQP-007', name: 'CMM Machine CMM-01',             code: 'CMM-01', supplier: 'Zeiss',         calibrationStatus: 'COMPLETED', calibrationDueDate: daysAhead(180) },
  { id: 'EQP-008', name: 'Surface Plate SP-15',            code: 'SP-15',  supplier: 'Starrett',      calibrationStatus: 'COMPLETED', calibrationDueDate: daysAhead(45) },
  { id: 'EQP-009', name: 'Torque Wrench TW-05',            code: 'TW-05',  supplier: 'CDI Torque',    calibrationStatus: 'PENDING',   calibrationDueDate: daysAhead(7) },
  { id: 'EQP-010', name: 'Digital Multimeter DM-02',       code: 'DM-02',  supplier: 'Fluke',         calibrationStatus: 'COMPLETED', calibrationDueDate: daysAhead(100) },
  { id: 'EQP-011', name: 'Oscilloscope OS-04',             code: 'OS-04',  supplier: 'Tektronix',     calibrationStatus: 'COMPLETED', calibrationDueDate: daysAhead(150) },
  { id: 'EQP-012', name: 'Bore Gauge BG-08',               code: 'BG-08',  supplier: 'Mitutoyo',      calibrationStatus: 'PENDING',   calibrationDueDate: daysAhead(3) },
];

export const initialInspectionMethods: InspectionMethod[] = [
  { id: 'METH-001', name: 'Physical Inspection',     description: 'Mechanical & dimensional measurements using physical tools (calipers, micrometers)',  isSystem: true },
  { id: 'METH-002', name: 'Chemical Inspection',     description: 'Material composition, chemistry and spectral analysis via lab instruments',           isSystem: true },
  { id: 'METH-003', name: 'Non-Destructive Testing', description: 'Ultrasonic, Radiographic, MPI, Dye Penetrant — tests without damaging the part',       isSystem: true },
  { id: 'METH-004', name: 'Instrumentive Inspection', description: 'Precision instrument-based (CMM, profilometer, oscilloscope, multimeter)',           isSystem: true },
  { id: 'METH-005', name: 'Visual / Observation',    description: 'Visual inspection and qualitative assessment',                                          isSystem: true },
  { id: 'METH-006', name: 'Functional Test',         description: 'Validates the equipment performs intended function',                                    isSystem: false },
  { id: 'METH-007', name: 'Environmental Test',      description: 'Tests behavior under varying temperature, humidity, vibration',                         isSystem: false },
  { id: 'METH-008', name: 'Destructive Testing',     description: 'Tensile, impact, hardness, burst tests (sample destroyed)',                              isSystem: false },
];

export const initialDocuments: MfgDocument[] = [
  { id: 'DOC-001', name: 'Engineering Drawing Rev-4',     code: 'DOC-ENG-04', description: 'Technical drawing with dimensional tolerances and specifications for the gearbox housing', manufacturingStageId: 'MFG-001', category: 'Design',      fileType: 'DWG',  fileName: 'gearbox-housing-rev4.dwg', fileSize: '2.4 MB', version: '4.0', uploadedBy: 'Priya Sharma',  uploadedAt: daysAgo(60) },
  { id: 'DOC-002', name: 'Material Test Certificate',     code: 'DOC-MTC-01', description: 'Material composition and properties certificate per EN24 specification',                  manufacturingStageId: 'MFG-002', category: 'Certificate', fileType: 'PDF',  fileName: 'mtc-en24-batch001.pdf',   fileSize: '850 KB', version: '1.0', uploadedBy: 'Kavitha Nair',   uploadedAt: daysAgo(55) },
  { id: 'DOC-003', name: 'Hardness Test Procedure',       code: 'DOC-HTP-01', description: 'Rockwell hardness measurement procedure with sample test points and acceptance criteria',  manufacturingStageId: 'MFG-003', category: 'Procedure',   fileType: 'PDF',  fileName: 'hardness-test-proc.pdf',  fileSize: '420 KB', version: '2.1', uploadedBy: 'Deepa Reddy',    uploadedAt: daysAgo(50) },
  { id: 'DOC-004', name: 'Surface Finish Certificate',    code: 'DOC-SFC-01', description: 'Surface roughness measurement certificate Ra <= 0.8 microns',                              manufacturingStageId: 'MFG-005', category: 'Certificate', fileType: 'PDF',  fileName: 'surface-finish-cert.pdf', fileSize: '180 KB', version: '1.0', uploadedBy: 'Ravi Patel',     uploadedAt: daysAgo(40) },
  { id: 'DOC-005', name: 'Assembly Checklist Template',   code: 'DOC-ACT-01', description: 'Step-by-step assembly verification checklist template with torque values',                manufacturingStageId: 'MFG-006', category: 'Checklist',   fileType: 'DOCX', fileName: 'assembly-checklist.docx', fileSize: '95 KB',  version: '3.0', uploadedBy: 'Suresh Kumar',   uploadedAt: daysAgo(35) },
  { id: 'DOC-006', name: 'Welding Procedure Spec (WPS)',  code: 'DOC-WPS-01', description: 'Approved welding procedure with parameters and acceptance criteria',                       manufacturingStageId: 'MFG-009', category: 'Procedure',   fileType: 'PDF',  fileName: 'wps-mig-arc.pdf',         fileSize: '1.1 MB', version: '2.0', uploadedBy: 'Deepa Reddy',    uploadedAt: daysAgo(30) },
  { id: 'DOC-007', name: 'Coating Inspection Guideline',  code: 'DOC-CIG-01', description: 'Anti-corrosion coating thickness and adhesion test guideline',                              manufacturingStageId: 'MFG-008', category: 'Guideline',   fileType: 'PDF',  fileName: 'coating-guide.pdf',       fileSize: '630 KB', version: '1.2', uploadedBy: 'Deepa Reddy',    uploadedAt: daysAgo(25) },
  { id: 'DOC-008', name: 'Final QC Report Template',      code: 'DOC-QCR-01', description: 'Final quality control report template with sign-off requirements',                          manufacturingStageId: 'MFG-010', category: 'Template',    fileType: 'XLSX', fileName: 'qc-report-template.xlsx', fileSize: '110 KB', version: '4.0', uploadedBy: 'Deepa Reddy',    uploadedAt: daysAgo(20) },
  { id: 'DOC-009', name: 'ISO 9001 Quality Policy',       code: 'DOC-POL-01', description: 'Company-wide quality policy aligned with ISO 9001:2015 standards',                          manufacturingStageId: 'MFG-001', category: 'Policy',      fileType: 'PDF',  fileName: 'iso9001-policy.pdf',      fileSize: '320 KB', version: '5.0', uploadedBy: 'Arjun Mehta',    uploadedAt: daysAgo(180) },
  { id: 'DOC-010', name: 'Safety Compliance Guideline',   code: 'DOC-SAF-01', description: 'EHS safety compliance guideline for machining operations',                                  manufacturingStageId: 'MFG-001', category: 'Guideline',   fileType: 'PDF',  fileName: 'safety-guide.pdf',        fileSize: '780 KB', version: '2.3', uploadedBy: 'Arjun Mehta',    uploadedAt: daysAgo(150) },
];

export const initialMaterialTypes: MaterialType[] = [
  { id: 'MTYP-001', name: 'Raw Material' },
  { id: 'MTYP-002', name: 'Semi-Finished' },
  { id: 'MTYP-003', name: 'Consumable' },
  { id: 'MTYP-004', name: 'Packaging' },
  { id: 'MTYP-005', name: 'Chemical' },
  { id: 'MTYP-006', name: 'Hardware' },
  { id: 'MTYP-007', name: 'Electronic Component' },
];

export const initialMaterials: Material[] = [
  { id: 'MAT-001', name: 'EN24 Alloy Steel',       code: 'MAT-EN24-01', materialTypeId: 'MTYP-001' },
  { id: 'MAT-002', name: 'EN31 Bearing Steel',     code: 'MAT-EN31-01', materialTypeId: 'MTYP-001' },
  { id: 'MAT-003', name: 'Copper Wire 1.5mm',      code: 'MAT-CU-01',   materialTypeId: 'MTYP-001' },
  { id: 'MAT-004', name: 'FR4 PCB Substrate',      code: 'MAT-FR4-01',  materialTypeId: 'MTYP-002' },
  { id: 'MAT-005', name: 'Bearing Grease NLGI 2',  code: 'MAT-BG-01',   materialTypeId: 'MTYP-003' },
  { id: 'MAT-006', name: 'Aluminum 6061-T6',       code: 'MAT-AL-01',   materialTypeId: 'MTYP-001' },
  { id: 'MAT-007', name: 'Cast Iron Grade 250',    code: 'MAT-CI-01',   materialTypeId: 'MTYP-001' },
  { id: 'MAT-008', name: 'Stainless Steel 304',    code: 'MAT-SS304',   materialTypeId: 'MTYP-001' },
  { id: 'MAT-009', name: 'Hex Bolt M8x40',         code: 'MAT-HB8-01',  materialTypeId: 'MTYP-006' },
  { id: 'MAT-010', name: 'O-Ring NBR 50mm',        code: 'MAT-OR-01',   materialTypeId: 'MTYP-003' },
  { id: 'MAT-011', name: 'Epoxy Coating Black',    code: 'MAT-EPX-01',  materialTypeId: 'MTYP-005' },
  { id: 'MAT-012', name: 'Corrugated Box L40',     code: 'MAT-CB-01',   materialTypeId: 'MTYP-004' },
  { id: 'MAT-013', name: 'Microcontroller ARM-32', code: 'MAT-MCU-01',  materialTypeId: 'MTYP-007' },
  { id: 'MAT-014', name: 'LED Display Module',     code: 'MAT-LED-01',  materialTypeId: 'MTYP-007' },
];

export const initialSuppliers: Supplier[] = [
  { id: 'SUP-001', name: 'SteelTech Pvt. Ltd.',     code: 'SUP-ST-01', materialIds: ['MAT-001', 'MAT-002', 'MAT-007'] },
  { id: 'SUP-002', name: 'BearingWorld Inc.',       code: 'SUP-BW-01', materialIds: ['MAT-002'] },
  { id: 'SUP-003', name: 'ElectroParts Co.',        code: 'SUP-EP-01', materialIds: ['MAT-003', 'MAT-004', 'MAT-013', 'MAT-014'] },
  { id: 'SUP-004', name: 'LubeMax Industries',      code: 'SUP-LM-01', materialIds: ['MAT-005'] },
  { id: 'SUP-005', name: 'AluCorp Engineering',     code: 'SUP-AC-01', materialIds: ['MAT-006', 'MAT-008'] },
  { id: 'SUP-006', name: 'FastenIt Hardware',       code: 'SUP-FH-01', materialIds: ['MAT-009'] },
  { id: 'SUP-007', name: 'SealPro Solutions',       code: 'SUP-SP-01', materialIds: ['MAT-010'] },
  { id: 'SUP-008', name: 'PaintMaster Chemicals',   code: 'SUP-PC-01', materialIds: ['MAT-011'] },
  { id: 'SUP-009', name: 'PackRight Industries',    code: 'SUP-PR-01', materialIds: ['MAT-012'] },
];

export const initialEvalMethods: SupplierEvalMethod[] = [
  { id: 'EVAL-001', name: 'Quality Rating',     description: 'Rate supplier quality on a 1-10 scale based on rejection rate',     isSystem: true },
  { id: 'EVAL-002', name: 'On-time Delivery',   description: 'Percentage of orders delivered on or before agreed date',           isSystem: true },
  { id: 'EVAL-003', name: 'Quantity Accuracy',  description: 'Percentage of orders with accurate quantities matching PO',         isSystem: true },
  { id: 'EVAL-004', name: 'Response Time',      description: 'Average response time to quotation requests and queries',           isSystem: false },
  { id: 'EVAL-005', name: 'Documentation',      description: 'Compliance with required documentation and certificates',            isSystem: false },
];

export const initialAuditLog: AuditLogEntry[] = [
  { id: 'A-001', action: 'Created', entityType: 'Product',     entityName: 'Sensor Module SM-50',      userName: 'Priya Sharma',  timestamp: hoursAgo(2) },
  { id: 'A-002', action: 'Updated', entityType: 'User',        entityName: 'Mohammed Yusuf',           userName: 'Priya Sharma',  timestamp: hoursAgo(5) },
  { id: 'A-003', action: 'Created', entityType: 'Equipment',   entityName: 'Bore Gauge BG-08',         userName: 'Deepa Reddy',   timestamp: hoursAgo(8) },
  { id: 'A-004', action: 'Created', entityType: 'Material',    entityName: 'Microcontroller ARM-32',   userName: 'Kavitha Nair',  timestamp: hoursAgo(14) },
  { id: 'A-005', action: 'Updated', entityType: 'Department',  entityName: 'Quality Control',          userName: 'Priya Sharma',  timestamp: daysAgo(1) },
  { id: 'A-006', action: 'Created', entityType: 'Supplier',    entityName: 'PackRight Industries',     userName: 'Kavitha Nair',  timestamp: daysAgo(1) },
  { id: 'A-007', action: 'Created', entityType: 'Component',   entityName: 'Connector Harness',        userName: 'Suresh Kumar',  timestamp: daysAgo(2) },
  { id: 'A-008', action: 'Updated', entityType: 'Product',     entityName: 'Drive Assembly DA-700',    userName: 'Suresh Kumar',  timestamp: daysAgo(2) },
  { id: 'A-009', action: 'Created', entityType: 'Document',    entityName: 'Welding Procedure Spec',   userName: 'Deepa Reddy',   timestamp: daysAgo(3) },
  { id: 'A-010', action: 'Updated', entityType: 'Equipment',   entityName: 'Torque Wrench TW-05',      userName: 'Deepa Reddy',   timestamp: daysAgo(3) },
  { id: 'A-011', action: 'Created', entityType: 'User',        entityName: 'Aditya Shah',              userName: 'Priya Sharma',  timestamp: daysAgo(4) },
  { id: 'A-012', action: 'Created', entityType: 'Material',    entityName: 'LED Display Module',       userName: 'Kavitha Nair',  timestamp: daysAgo(5) },
  { id: 'A-013', action: 'Updated', entityType: 'Supplier',    entityName: 'SteelTech Pvt. Ltd.',      userName: 'Kavitha Nair',  timestamp: daysAgo(6) },
  { id: 'A-014', action: 'Created', entityType: 'Equipment',   entityName: 'Oscilloscope OS-04',       userName: 'Deepa Reddy',   timestamp: daysAgo(7) },
  { id: 'A-015', action: 'Deleted', entityType: 'Department',  entityName: 'Logistics (archived)',     userName: 'Priya Sharma',  timestamp: daysAgo(8) },
];

export const currentUser = {
  id: 'U-001',
  name: 'Priya Sharma',
  email: 'priya@pqas.com',
  role: 'Admin',
};
