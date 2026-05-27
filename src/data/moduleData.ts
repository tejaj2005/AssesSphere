import type {
  MaterialReceivedPlan, ApprovedVendor, MaterialStockStatement,
  ProductQualityPlan, InspectorAssignment, InspectionChecklist, CalibrationApproval,
  InspectionReport, InspectorTask, ChecklistItem, ReportParameter,
} from '@/types';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// ─── Stores Manager ───
export const initialMaterialPlans: MaterialReceivedPlan[] = [
  { id: 'MP-001', planCode: 'MRI-PLAN-001', date: daysAgo(30), materialId: 'MAT-001', materialName: 'EN24 Alloy Steel', quantity: 500, unit: 'kg', supplierId: 'SUP-001', supplierName: 'SteelTech Pvt. Ltd.', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', inspectorId: 'U-006', inspectorName: 'Ravi Patel', method: 'PHYSICAL_TEST', overallStatus: 'APPROVED', reviewStatus: 'APPROVED', createdBy: 'Kavitha Nair', createdAt: daysAgo(31), reviewedBy: 'Kavitha Nair', reviewedDate: daysAgo(28),
    parameters: [
      { id: 'mpp-1', parameterName: 'Hardness', unit: 'HRC', targetValue: 32, actualValue: 31, variance: -3.1, status: 'AMBER', observation: 'Slightly below spec, acceptable' },
      { id: 'mpp-2', parameterName: 'Grade Certificate', unit: 'pass', targetValue: 1, actualValue: 1, variance: 0, status: 'GREEN' },
    ] },
  { id: 'MP-002', planCode: 'MRI-PLAN-002', date: daysAgo(28), materialId: 'MAT-002', materialName: 'EN31 Bearing Steel', quantity: 200, unit: 'kg', supplierId: 'SUP-002', supplierName: 'BearingWorld Inc.', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', inspectorId: 'U-006', inspectorName: 'Ravi Patel', method: 'PHYSICAL_TEST', overallStatus: 'APPROVED', reviewStatus: 'APPROVED', createdBy: 'Kavitha Nair', createdAt: daysAgo(29), reviewedBy: 'Kavitha Nair', reviewedDate: daysAgo(27),
    parameters: [{ id: 'mpp-3', parameterName: 'Hardness', unit: 'HRC', targetValue: 62, actualValue: 63, variance: 1.6, status: 'GREEN' }] },
  { id: 'MP-003', planCode: 'MRI-PLAN-003', date: daysAgo(26), materialId: 'MAT-003', materialName: 'Copper Wire 1.5mm', quantity: 100, unit: 'meters', supplierId: 'SUP-003', supplierName: 'ElectroParts Co.', productId: 'PROD-003', productName: 'Control Panel CP-100', inspectorId: 'U-007', inspectorName: 'Priya Das', method: 'ANALYTICAL_TEST', overallStatus: 'APPROVED', reviewStatus: 'APPROVED', createdBy: 'Kavitha Nair', createdAt: daysAgo(27), reviewedBy: 'Kavitha Nair', reviewedDate: daysAgo(25),
    parameters: [{ id: 'mpp-4', parameterName: 'Conductivity', unit: '% IACS', targetValue: 100, actualValue: 98.5, variance: -1.5, status: 'GREEN' }] },
  { id: 'MP-004', planCode: 'MRI-PLAN-004', date: daysAgo(12), materialId: 'MAT-005', materialName: 'Bearing Grease NLGI 2', quantity: 50, unit: 'liters', supplierId: 'SUP-004', supplierName: 'LubeMax Industries', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', inspectorId: 'U-008', inspectorName: 'Mohammed Yusuf', method: 'ANALYTICAL_TEST', overallStatus: 'REJECTED', reviewStatus: 'REJECTED', createdBy: 'Kavitha Nair', createdAt: daysAgo(13), reviewedBy: 'Kavitha Nair', reviewedDate: daysAgo(11), reviewComment: 'Viscosity well below spec; return shipment.',
    parameters: [{ id: 'mpp-5', parameterName: 'Viscosity', unit: 'cSt', targetValue: 150, actualValue: 128, variance: -14.7, status: 'RED', observation: 'Critical out of spec' }] },
  { id: 'MP-005', planCode: 'MRI-PLAN-005', date: daysAgo(3), materialId: 'MAT-004', materialName: 'FR4 PCB Substrate', quantity: 200, unit: 'pcs', supplierId: 'SUP-003', supplierName: 'ElectroParts Co.', productId: 'PROD-003', productName: 'Control Panel CP-100', inspectorId: 'U-007', inspectorName: 'Priya Das', method: 'PHYSICAL_TEST', overallStatus: 'INSPECTED', reviewStatus: 'PENDING', createdBy: 'Kavitha Nair', createdAt: daysAgo(4),
    parameters: [{ id: 'mpp-6', parameterName: 'Thickness', unit: 'mm', targetValue: 1.6, actualValue: 1.58, variance: -1.25, status: 'GREEN' }] },
];

export const initialApprovedVendors: ApprovedVendor[] = [
  { id: 'AV-001', supplierId: 'SUP-001', supplierName: 'SteelTech Pvt. Ltd.', supplierCode: 'SUP-ST-01', servicesDetails: 'Alloy and bearing steel raw materials', approvedDate: daysAgo(120), reviewedBy: 'Kavitha Nair', approvedBy: 'Deepa Reddy', status: 'APPROVED' },
  { id: 'AV-002', supplierId: 'SUP-002', supplierName: 'BearingWorld Inc.', supplierCode: 'SUP-BW-01', servicesDetails: 'Bearing steel and pre-assembled bearings', approvedDate: daysAgo(100), reviewedBy: 'Kavitha Nair', approvedBy: 'Deepa Reddy', status: 'APPROVED' },
  { id: 'AV-003', supplierId: 'SUP-003', supplierName: 'ElectroParts Co.', supplierCode: 'SUP-EP-01', servicesDetails: 'Electronic components, copper wiring, PCB substrates', approvedDate: daysAgo(90), reviewedBy: 'Kavitha Nair', approvedBy: 'Deepa Reddy', status: 'APPROVED' },
];

export const initialStockStatements: MaterialStockStatement[] = [
  { id: 'SS-001', date: daysAgo(1), materialId: 'MAT-001', materialName: 'EN24 Alloy Steel', materialCode: 'MAT-EN24-01', totalAvailable: 500, approvedCount: 480, rejectedCount: 20, pendingCount: 0, category: 'Raw Material', preparedBy: 'Kavitha Nair', unit: 'kg' },
  { id: 'SS-002', date: daysAgo(1), materialId: 'MAT-002', materialName: 'EN31 Bearing Steel', materialCode: 'MAT-EN31-01', totalAvailable: 200, approvedCount: 200, rejectedCount: 0, pendingCount: 0, category: 'Raw Material', preparedBy: 'Kavitha Nair', unit: 'kg' },
  { id: 'SS-003', date: daysAgo(1), materialId: 'MAT-003', materialName: 'Copper Wire 1.5mm', materialCode: 'MAT-CU-01', totalAvailable: 100, approvedCount: 95, rejectedCount: 0, pendingCount: 5, category: 'Raw Material', preparedBy: 'Kavitha Nair', unit: 'meters' },
  { id: 'SS-004', date: daysAgo(1), materialId: 'MAT-004', materialName: 'FR4 PCB Substrate', materialCode: 'MAT-FR4-01', totalAvailable: 200, approvedCount: 180, rejectedCount: 5, pendingCount: 15, category: 'Semi-Finished', preparedBy: 'Kavitha Nair', unit: 'pcs' },
  { id: 'SS-005', date: daysAgo(1), materialId: 'MAT-005', materialName: 'Bearing Grease NLGI 2', materialCode: 'MAT-BG-01', totalAvailable: 50, approvedCount: 0, rejectedCount: 50, pendingCount: 0, category: 'Consumable', preparedBy: 'Kavitha Nair', unit: 'liters' },
];

// ─── Quality Manager ───
export const initialQualityPlans: ProductQualityPlan[] = [
  {
    id: 'PQP-001', planCode: 'PQP-001', date: daysAgo(40),
    productId: 'PROD-001', productName: 'GearBox Assembly GX-200', productCode: 'GX-200',
    reviewerId: 'U-005', reviewerName: 'Deepa Reddy', reviewDate: daysAgo(38),
    status: 'IN_PROGRESS', pmAcknowledged: true, completionPercentage: 33, createdAt: daysAgo(40),
    manufacturingStages: [
      { stageId: 'MFG-001', stageName: 'Machining', requirements: 'Dimensional accuracy ±0.02mm, surface finish Ra ≤ 1.6µm', checklistId: 'CHK-001', checklistName: 'CHK-MFG-001', equipmentIds: ['EQP-002', 'EQP-004'], inspectorId: 'U-006', inspectorName: 'Ravi Patel', reportStatus: 'APPROVED' },
      { stageId: 'MFG-002', stageName: 'Heat Treatment', requirements: 'Hardness 58 HRC, Case depth 1.2mm', equipmentIds: ['EQP-001'], inspectorId: 'U-006', inspectorName: 'Ravi Patel', reportStatus: 'SUBMITTED' },
      { stageId: 'MFG-003', stageName: 'Grinding', requirements: 'Roundness ≤ 0.005mm, surface finish Ra ≤ 0.4µm', equipmentIds: ['EQP-005', 'EQP-004'], inspectorId: 'U-006', inspectorName: 'Ravi Patel', reportStatus: 'IN_PROGRESS' },
    ],
    assemblingStages: [
      { stageId: 'ASM-001', stageName: 'Sub-Assembly', requirements: 'Backlash 0.08mm, gear mesh score ≥ 95', equipmentIds: ['EQP-005'], inspectorId: 'U-007', inspectorName: 'Priya Das', reportStatus: 'IN_PROGRESS' },
      { stageId: 'ASM-002', stageName: 'Final Assembly', requirements: 'Noise ≤ 75dB, run temp ≤ 80°C', equipmentIds: ['EQP-010'], reportStatus: 'NOT_STARTED' },
    ],
    finishedProduct: { stageId: 'FP-001', stageName: 'Final Product Inspection', requirements: 'Full visual + functional 30-min run test', checklistId: 'CHK-003', checklistName: 'CHK-FP-001', equipmentIds: ['EQP-001', 'EQP-010'], reportStatus: 'NOT_STARTED' },
  },
  {
    id: 'PQP-002', planCode: 'PQP-002', date: daysAgo(30),
    productId: 'PROD-002', productName: 'Shaft Unit SH-400', productCode: 'SH-400',
    reviewerId: 'U-005', reviewerName: 'Deepa Reddy',
    status: 'IN_PROGRESS', pmAcknowledged: false, completionPercentage: 25, createdAt: daysAgo(30),
    manufacturingStages: [
      { stageId: 'MFG-004', stageName: 'CNC Turning', requirements: 'Length 450±0.05, Diameter 25±0.01', equipmentIds: ['EQP-002'], inspectorId: 'U-008', inspectorName: 'Mohammed Yusuf', reportStatus: 'APPROVED' },
      { stageId: 'MFG-005', stageName: 'Surface Finishing', requirements: 'Ra ≤ 0.8µm', equipmentIds: ['EQP-004'], inspectorId: 'U-008', inspectorName: 'Mohammed Yusuf', reportStatus: 'SUBMITTED' },
    ],
    assemblingStages: [
      { stageId: 'ASM-002', stageName: 'Final Assembly', requirements: 'Coupling alignment, torque check', equipmentIds: [], reportStatus: 'NOT_STARTED' },
    ],
    finishedProduct: { stageId: 'FP-002', stageName: 'Final Product Inspection', requirements: 'Full balance test', equipmentIds: [], reportStatus: 'NOT_STARTED' },
  },
];

export const initialInspectorAssignments: InspectorAssignment[] = [
  { id: 'IA-001', planId: 'IP-001', planCode: 'MFG-PLAN-001', planType: 'MANUFACTURING', productName: 'GearBox GX-200', stageName: 'Machining',        inspectorId: 'U-006', inspectorName: 'Ravi Patel',      assignedDate: daysAgo(25), assignedBy: 'Deepa Reddy', status: 'COMPLETED' },
  { id: 'IA-002', planId: 'IP-002', planCode: 'MFG-PLAN-002', planType: 'MANUFACTURING', productName: 'GearBox GX-200', stageName: 'Heat Treatment',  inspectorId: 'U-006', inspectorName: 'Ravi Patel',      assignedDate: daysAgo(22), assignedBy: 'Deepa Reddy', status: 'COMPLETED' },
  { id: 'IA-003', planId: 'IP-003', planCode: 'MFG-PLAN-003', planType: 'MANUFACTURING', productName: 'GearBox GX-200', stageName: 'Grinding',        inspectorId: 'U-006', inspectorName: 'Ravi Patel',      assignedDate: daysAgo(20), assignedBy: 'Deepa Reddy', status: 'IN_PROGRESS' },
  { id: 'IA-004', planId: 'IP-007', planCode: 'MAT-PLAN-001', planType: 'MATERIAL_RECEIVED', productName: 'GearBox GX-200', stageName: 'EN24 Steel',  inspectorId: 'U-006', inspectorName: 'Ravi Patel',      assignedDate: daysAgo(30), assignedBy: 'Deepa Reddy', status: 'COMPLETED' },
  { id: 'IA-005', planId: 'IP-005', planCode: 'ASM-PLAN-001', planType: 'ASSEMBLING',    productName: 'GearBox GX-200', stageName: 'Sub-Assembly',   inspectorId: 'U-007', inspectorName: 'Priya Das',       assignedDate: daysAgo(15), assignedBy: 'Deepa Reddy', status: 'IN_PROGRESS' },
  { id: 'IA-006', planId: 'MP-003', planCode: 'MRI-PLAN-003', planType: 'MATERIAL_RECEIVED', productName: 'Control Panel CP-100', stageName: 'Copper Wire', inspectorId: 'U-007', inspectorName: 'Priya Das', assignedDate: daysAgo(26), assignedBy: 'Deepa Reddy', status: 'COMPLETED' },
  { id: 'IA-007', planId: 'IP-006', planCode: 'ASM-PLAN-002', planType: 'ASSEMBLING',    productName: 'GearBox GX-200', stageName: 'Final Assembly', inspectorId: 'U-008', inspectorName: 'Mohammed Yusuf',  assignedDate: daysAgo(3),  assignedBy: 'Deepa Reddy', status: 'ASSIGNED' },
  { id: 'IA-008', planId: 'MP-004', planCode: 'MRI-PLAN-004', planType: 'MATERIAL_RECEIVED', productName: 'GearBox GX-200', stageName: 'Bearing Grease', inspectorId: 'U-008', inspectorName: 'Mohammed Yusuf', assignedDate: daysAgo(12), assignedBy: 'Deepa Reddy', status: 'COMPLETED' },
];

const cItems = (...arr: [string, ChecklistItem['observation'], string?][]): ChecklistItem[] =>
  arr.map(([item, obs, note], i) => ({ id: `ci-${Math.random().toString(36).slice(2, 8)}`, slNo: i + 1, item, observation: obs, note, performedBy: obs !== 'PENDING' ? 'Ravi Patel' : undefined, performedDate: obs !== 'PENDING' ? daysAgo(5) : undefined }));

export const initialChecklists: InspectionChecklist[] = [
  { id: 'CHK-001', checklistCode: 'CHK-MFG-001', type: 'MANUFACTURING', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', linkedPlanId: 'IP-001', status: 'ACTIVE', createdBy: 'Deepa Reddy', createdAt: daysAgo(35),
    items: cItems(
      ['Visual inspection of raw billet — no cracks', 'PASS'],
      ['Outer diameter within ±0.02mm tolerance', 'PASS'],
      ['Surface roughness ≤ 1.6µm', 'PASS'],
      ['Internal bore concentricity check', 'FAIL', 'Off-center by 0.03mm, reworked'],
      ['Burr removal verified', 'PENDING'],
    ) },
  { id: 'CHK-002', checklistCode: 'CHK-ASM-001', type: 'ASSEMBLING', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', linkedPlanId: 'IP-006', status: 'ACTIVE', createdBy: 'Deepa Reddy', createdAt: daysAgo(30),
    items: cItems(
      ['All sub-assemblies installed', 'PENDING'],
      ['Torque values per spec sheet', 'PENDING'],
      ['Oil filled to correct level', 'PENDING'],
      ['Visual inspection — no exterior damage', 'PENDING'],
    ) },
  { id: 'CHK-003', checklistCode: 'CHK-FP-001', type: 'FINAL_PRODUCT', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', status: 'ACTIVE', createdBy: 'Deepa Reddy', createdAt: daysAgo(25),
    items: cItems(
      ['Visual inspection of housing — no cracks or damage', 'PASS'],
      ['Gear mesh check — smooth operation', 'PASS'],
      ['Backlash measurement within tolerance', 'PASS'],
      ['Oil seal integrity — no leaks', 'PENDING'],
      ['Nameplate marking — correct and legible', 'PENDING'],
      ['Functional run test 30 minutes', 'PENDING'],
      ['Temperature after run ≤ 80°C', 'PENDING'],
    ) },
];

export const initialCalibrationApprovals: CalibrationApproval[] = [
  { id: 'CA-001', equipmentId: 'EQP-003', equipmentName: 'Micrometer MC-11', equipmentCode: 'MC-11', dueDate: daysAhead(1), calibrationLab: 'NationalCal', certificateNumber: 'NC-2026-441', calibrationStandard: 'ISO 3611', result: 'PASS', nextDueDate: daysAhead(365), inspectorRemarks: 'All measurements within tolerance, certified.', certificateFileName: 'NC-2026-441.pdf', approvalStatus: 'PENDING' },
  { id: 'CA-002', equipmentId: 'EQP-006', equipmentName: 'Spectrophotometer SP-02', equipmentCode: 'SP-02', dueDate: daysAhead(4), calibrationLab: 'OpticsLab', certificateNumber: 'OL-2026-892', calibrationStandard: 'ISO 7027', result: 'PASS', nextDueDate: daysAhead(370), inspectorRemarks: 'Wavelength accuracy verified across full range.', certificateFileName: 'OL-2026-892.pdf', approvalStatus: 'PENDING' },
  { id: 'CA-003', equipmentId: 'EQP-002', equipmentName: 'Vernier Caliper VC-07', equipmentCode: 'VC-07', dueDate: daysAhead(11), calibrationLab: 'NationalCal', certificateNumber: 'NC-2026-339', calibrationStandard: 'ISO 13385', result: 'PASS', nextDueDate: daysAhead(380), inspectorRemarks: 'Calibration complete, no adjustments needed.', certificateFileName: 'NC-2026-339.pdf', approvalStatus: 'APPROVED', approvedBy: 'Deepa Reddy', approvedDate: daysAgo(5) },
];

// ─── Inspector ───
const makeParam = (name: string, unit: string, target: number, readings: number[], equipment: string): ReportParameter => {
  const actual = readings.reduce((a, b) => a + b, 0) / readings.length;
  const variance = target === 0 ? 0 : ((actual - target) / target) * 100;
  const v = Math.abs(variance);
  const status = v <= 2 ? 'GREEN' : v <= 5 ? 'AMBER' : 'RED';
  return { id: `rp-${Math.random().toString(36).slice(2, 8)}`, parameterName: name, unit, targetValue: target, readings, actualValue: actual, variance, status, equipment };
};

export const initialInspectionReports: InspectionReport[] = [
  { id: 'IR-MAT-001', reportCode: 'IR-MAT-001', type: 'MATERIAL', planId: 'MP-001', planCode: 'MRI-PLAN-001', materialName: 'EN24 Alloy Steel', supplierName: 'SteelTech Pvt. Ltd.', productName: 'GearBox Assembly GX-200',
    parameters: [makeParam('Hardness', 'HRC', 32, [31], 'Rockwell Hardness Tester RH-01'), makeParam('Grade Certificate', 'pass', 1, [1], 'Vernier Caliper VC-07')],
    observations: 'Hardness slightly below spec but within acceptable range', evidenceFiles: ['en24-hardness-cert.pdf'], overallStatus: 'APPROVED',
    inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(30), submittedDate: daysAgo(29), reportStatus: 'L1_APPROVED',
    l1ReviewerName: 'Kavitha Nair', l1ReviewDate: daysAgo(28), l1Comment: 'Approved — material cleared for stores.' },
  { id: 'IR-MAT-002', reportCode: 'IR-MAT-002', type: 'MATERIAL', planId: 'MP-004', planCode: 'MRI-PLAN-004', materialName: 'Bearing Grease NLGI 2', supplierName: 'LubeMax Industries', productName: 'GearBox Assembly GX-200',
    parameters: [makeParam('Viscosity', 'cSt', 150, [128, 127, 129], 'Spectrophotometer SP-02')],
    observations: 'Viscosity well below spec across 3 readings', evidenceFiles: ['lubemax-viscosity-test.pdf'], overallStatus: 'REJECTED',
    inspectorId: 'U-008', inspectorName: 'Mohammed Yusuf', inspectionDate: daysAgo(12), submittedDate: daysAgo(11), reportStatus: 'REJECTED',
    l1ReviewerName: 'Kavitha Nair', l1ReviewDate: daysAgo(11), l1Comment: 'Viscosity too low, retest needed with a fresh sample.' },
  { id: 'IR-MFG-001', reportCode: 'IR-MFG-001', type: 'COMPONENT', planId: 'IP-001', planCode: 'MFG-PLAN-001', productName: 'GearBox Assembly GX-200', stageName: 'Machining',
    parameters: [makeParam('Outer Diameter', 'mm', 50, [50.02, 50.01, 50.03], 'Vernier Caliper VC-07'), makeParam('Surface Roughness Ra', 'µm', 1.6, [1.55], 'Profilometer PR-03')],
    observations: 'Within tolerance, no issues observed', evidenceFiles: ['machining-report.pdf'], overallStatus: 'APPROVED',
    inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(25), submittedDate: daysAgo(24), reportStatus: 'FINAL_APPROVED',
    l1ReviewerName: 'Suresh Kumar', l1ReviewDate: daysAgo(24), qmReviewerName: 'Deepa Reddy', qmReviewDate: daysAgo(23), qmComment: 'Final approved.' },
  { id: 'IR-MFG-002', reportCode: 'IR-MFG-002', type: 'COMPONENT', planId: 'IP-002', planCode: 'MFG-PLAN-002', productName: 'GearBox Assembly GX-200', stageName: 'Heat Treatment',
    parameters: [makeParam('Hardness', 'HRC', 58, [55, 56, 55], 'Rockwell Hardness Tester RH-01'), makeParam('Case Depth', 'mm', 1.2, [1.18], 'Rockwell Hardness Tester RH-01')],
    observations: 'Hardness below target — recommended re-temper', evidenceFiles: ['heat-treat-report.pdf'], overallStatus: 'HOLD',
    inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(22), submittedDate: daysAgo(21), reportStatus: 'SUBMITTED' },
  { id: 'IR-COMP-001', reportCode: 'IR-COMP-001', type: 'COMPONENT', planId: 'IP-008', planCode: 'COMP-PLAN-001', productName: 'GearBox Assembly GX-200', componentName: 'Bearing Assembly',
    parameters: [makeParam('Bearing Clearance', 'mm', 0.02, [0.022, 0.021, 0.022], 'Dial Gauge DG-04')],
    observations: 'Average within tolerance', evidenceFiles: ['bearing-comp.pdf'], overallStatus: 'APPROVED',
    inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(19), submittedDate: daysAgo(18), reportStatus: 'FINAL_APPROVED',
    l1ReviewerName: 'Suresh Kumar', l1ReviewDate: daysAgo(17), qmReviewerName: 'Deepa Reddy', qmReviewDate: daysAgo(16), qmComment: 'Approved.' },
  { id: 'IR-ASM-001', reportCode: 'IR-ASM-001', type: 'ASSEMBLY', planId: 'IP-005', planCode: 'ASM-PLAN-001', productName: 'GearBox Assembly GX-200', stageName: 'Sub-Assembly', assemblerResource: 'Priya Das',
    parameters: [makeParam('Backlash', 'mm', 0.08, [0.07], 'Dial Gauge DG-04'), makeParam('Gear Mesh', 'score', 100, [98], 'Vernier Caliper VC-07')],
    checklistItems: [
      { id: 'rci-1', item: 'All sub-assemblies installed', result: 'PASS' },
      { id: 'rci-2', item: 'Torque values per spec sheet', result: 'PASS' },
      { id: 'rci-3', item: 'Oil filled to correct level', result: 'PENDING' },
      { id: 'rci-4', item: 'Visual inspection — no exterior damage', result: 'PENDING' },
    ],
    observations: 'In progress', evidenceFiles: [], overallStatus: 'HOLD',
    inspectorId: 'U-007', inspectorName: 'Priya Das', inspectionDate: daysAgo(15), reportStatus: 'IN_PROGRESS' },
  { id: 'IR-FP-001', reportCode: 'IR-FP-001', type: 'FINAL_PRODUCT', planId: 'PQP-001', planCode: 'PQP-001', productName: 'GearBox Assembly GX-200',
    parameters: [],
    checklistItems: [
      { id: 'rci-fp-1', item: 'Visual inspection of housing — no cracks', result: 'PENDING' },
      { id: 'rci-fp-2', item: 'Gear mesh check', result: 'PENDING' },
      { id: 'rci-fp-3', item: 'Backlash measurement', result: 'PENDING' },
      { id: 'rci-fp-4', item: 'Oil seal integrity', result: 'PENDING' },
      { id: 'rci-fp-5', item: 'Nameplate marking', result: 'PENDING' },
      { id: 'rci-fp-6', item: 'Functional run test 30min', result: 'PENDING' },
      { id: 'rci-fp-7', item: 'Temperature after run', result: 'PENDING' },
    ],
    observations: '', evidenceFiles: [], overallStatus: 'HOLD',
    inspectorId: 'U-008', inspectorName: 'Mohammed Yusuf', inspectionDate: daysAhead(2), reportStatus: 'ASSIGNED' },
  { id: 'IR-CAL-001', reportCode: 'IR-CAL-001', type: 'CALIBRATION', productName: 'Micrometer MC-11',
    parameters: [], observations: 'Calibrated against ISO 3611 standard. All measurements within tolerance.', evidenceFiles: ['NC-2026-441.pdf'], overallStatus: 'APPROVED',
    inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(2), submittedDate: daysAgo(1), reportStatus: 'SUBMITTED' },
];

export const initialInspectorTasks: InspectorTask[] = [
  { id: 'IT-001', planId: 'IP-003', planCode: 'MFG-PLAN-003', type: 'COMPONENT', productName: 'GearBox Assembly GX-200', stageName: 'Grinding',         dueDate: daysAhead(1), equipment: 'Profilometer PR-03', status: 'ASSIGNED' },
  { id: 'IT-002', planId: 'IP-007', planCode: 'MAT-PLAN-001', type: 'MATERIAL',  productName: 'GearBox Assembly GX-200', stageName: 'EN24 Steel',       dueDate: daysAhead(-1), equipment: 'Rockwell Hardness Tester RH-01', status: 'APPROVED', reportId: 'IR-MAT-001' },
  { id: 'IT-003', planId: 'IP-002', planCode: 'MFG-PLAN-002', type: 'COMPONENT', productName: 'GearBox Assembly GX-200', stageName: 'Heat Treatment',   dueDate: daysAhead(-2), equipment: 'Rockwell Hardness Tester RH-01', status: 'SUBMITTED', reportId: 'IR-MFG-002' },
  { id: 'IT-004', planId: 'IP-008', planCode: 'COMP-PLAN-001', type: 'COMPONENT', productName: 'GearBox Assembly GX-200', stageName: 'Bearing Assembly', dueDate: daysAhead(2), equipment: 'Dial Gauge DG-04', status: 'ASSIGNED' },
  { id: 'IT-005', planId: 'MP-004', planCode: 'MRI-PLAN-004', type: 'MATERIAL',  productName: 'GearBox Assembly GX-200', stageName: 'Bearing Grease',  dueDate: daysAhead(-10), equipment: 'Spectrophotometer SP-02', status: 'REJECTED', reportId: 'IR-MAT-002', rejectionComment: 'Retest with fresh sample' },
  { id: 'IT-006', planId: 'CA-001', planCode: 'CAL-001',     type: 'CALIBRATION', productName: 'Micrometer MC-11', stageName: 'Calibration',     dueDate: daysAhead(4), equipment: 'Micrometer MC-11', status: 'SUBMITTED', reportId: 'IR-CAL-001' },
];
