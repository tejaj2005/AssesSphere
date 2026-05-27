import type { InspectionRecord, InspectionPlan, ResourceAssignment, SupplierEvaluation, RAGStatus } from '@/types';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const calcVariance = (target: number, actual: number) => {
  if (target === 0) return 0;
  return ((actual - target) / target) * 100;
};

export const ragFromVariance = (variance: number): RAGStatus => {
  const v = Math.abs(variance);
  if (v <= 2) return 'GREEN';
  if (v <= 5) return 'AMBER';
  return 'RED';
};

const rec = (
  i: number, daysOff: number, productId: string, productName: string, productCode: string,
  type: any, stageName: string | undefined, parameterName: string, unit: string,
  target: number, actual: number, inspectorName: string, inspectorId: string,
  reviewStatus: any = 'PENDING', reviewedBy?: string, reviewedDate?: string,
  extra: Partial<InspectionRecord> = {}
): InspectionRecord => {
  const variance = calcVariance(target, actual);
  return {
    id: `IR-${String(i).padStart(3, '0')}`,
    date: daysAgo(daysOff),
    productId, productName, productCode, type, stageName,
    inspectionDetails: extra.inspectionDetails || `${parameterName} inspection per spec`,
    parameterName, unit, targetValue: target, actualValue: actual, variance,
    status: ragFromVariance(variance),
    inspectorName, inspectorId,
    reviewedBy, reviewedDate: reviewedDate ? daysAgo(parseInt(reviewedDate)) : undefined,
    reviewStatus, observations: extra.observations,
    equipmentUsed: extra.equipmentUsed || 'EQP-001',
    ...extra,
  };
};

export const initialInspectionRecords: InspectionRecord[] = [
  // GearBox GX-200 - Machining
  rec(1, 25, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MANUFACTURING', 'Machining', 'Outer Diameter', 'mm', 50.0, 50.02, 'Ravi Patel', 'U-006', 'APPROVED', 'Suresh Kumar', '24', { equipmentUsed: 'Vernier Caliper VC-07' }),
  rec(2, 25, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MANUFACTURING', 'Machining', 'Surface Roughness Ra', 'µm', 1.6, 1.55, 'Ravi Patel', 'U-006', 'APPROVED', 'Suresh Kumar', '24', { equipmentUsed: 'Profilometer PR-03' }),
  // GearBox GX-200 - Heat Treatment
  rec(3, 22, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MANUFACTURING', 'Heat Treatment', 'Hardness', 'HRC', 58, 55, 'Ravi Patel', 'U-006', 'PENDING', undefined, undefined, { equipmentUsed: 'Rockwell Hardness Tester RH-01', observations: 'Hardness below target — re-temper recommended' }),
  rec(4, 22, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MANUFACTURING', 'Heat Treatment', 'Case Depth', 'mm', 1.2, 1.18, 'Ravi Patel', 'U-006', 'APPROVED', 'Suresh Kumar', '21'),
  // GearBox GX-200 - Grinding
  rec(5, 20, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MANUFACTURING', 'Grinding', 'Roundness', 'mm', 0.005, 0.004, 'Ravi Patel', 'U-006', 'REJECTED', 'Suresh Kumar', '19', { reviewComment: 'Out of tolerance band, redo grinding pass.' }),
  rec(6, 20, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MANUFACTURING', 'Grinding', 'Surface Finish', 'µm', 0.4, 0.38, 'Ravi Patel', 'U-006', 'APPROVED', 'Suresh Kumar', '19'),
  // GearBox GX-200 - Sub-Assembly
  rec(7, 15, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'ASSEMBLING', 'Sub-Assembly', 'Backlash', 'mm', 0.08, 0.07, 'Priya Das', 'U-007', 'PENDING'),
  rec(8, 15, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'ASSEMBLING', 'Sub-Assembly', 'Gear Mesh', 'score', 100, 98, 'Priya Das', 'U-007', 'APPROVED', 'Suresh Kumar', '14'),
  // GearBox GX-200 - Final Assembly
  rec(9, 10, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'ASSEMBLING', 'Final Assembly', 'Noise Level', 'dB', 75, 72, 'Priya Das', 'U-007', 'APPROVED', 'Suresh Kumar', '9'),
  rec(10, 10, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'ASSEMBLING', 'Final Assembly', 'Run Temperature', '°C', 80, 68, 'Priya Das', 'U-007', 'APPROVED', 'Suresh Kumar', '9'),
  // Shaft SH-400
  rec(11, 18, 'PROD-002', 'Shaft Unit SH-400', 'SH-400', 'MANUFACTURING', 'CNC Turning', 'Length', 'mm', 450, 450.1, 'Mohammed Yusuf', 'U-008', 'APPROVED', 'Suresh Kumar', '17'),
  rec(12, 18, 'PROD-002', 'Shaft Unit SH-400', 'SH-400', 'MANUFACTURING', 'CNC Turning', 'Diameter', 'mm', 25.0, 25.03, 'Mohammed Yusuf', 'U-008', 'APPROVED', 'Suresh Kumar', '17'),
  rec(13, 14, 'PROD-002', 'Shaft Unit SH-400', 'SH-400', 'MANUFACTURING', 'Surface Finishing', 'Roughness', 'µm', 0.8, 0.95, 'Mohammed Yusuf', 'U-008', 'PENDING', undefined, undefined, { observations: 'Above tolerance, recommend re-polish' }),
  // Control Panel CP-100
  rec(14, 8, 'PROD-003', 'Control Panel CP-100', 'CP-100', 'MANUFACTURING', 'PCB Assembly', 'Solder Quality', 'class', 2, 2, 'Lakshmi Rao', 'U-013', 'APPROVED', 'Suresh Kumar', '7'),
  rec(15, 8, 'PROD-003', 'Control Panel CP-100', 'CP-100', 'MANUFACTURING', 'PCB Assembly', 'Continuity Test', 'pass', 1, 1, 'Lakshmi Rao', 'U-013', 'APPROVED', 'Suresh Kumar', '7'),
  rec(16, 5, 'PROD-003', 'Control Panel CP-100', 'CP-100', 'ASSEMBLING', 'Testing', 'Voltage Output', 'V', 24.0, 24.3, 'Nikhil Joshi', 'U-014', 'APPROVED', 'Suresh Kumar', '4'),

  // Material inspections
  rec(17, 30, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MATERIAL', undefined, 'Hardness', 'HRC', 32, 31, 'Ravi Patel', 'U-006', 'APPROVED', 'Deepa Reddy', '29', { materialName: 'EN24 Alloy Steel', materialId: 'MAT-001', supplierName: 'SteelTech Pvt. Ltd.' }),
  rec(18, 30, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MATERIAL', undefined, 'Grade Certificate', 'pass', 1, 1, 'Ravi Patel', 'U-006', 'APPROVED', 'Deepa Reddy', '29', { materialName: 'EN24 Alloy Steel', materialId: 'MAT-001', supplierName: 'SteelTech Pvt. Ltd.' }),
  rec(19, 28, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MATERIAL', undefined, 'Hardness', 'HRC', 62, 63, 'Ravi Patel', 'U-006', 'APPROVED', 'Deepa Reddy', '27', { materialName: 'EN31 Bearing Steel', materialId: 'MAT-002', supplierName: 'BearingWorld Inc.' }),
  rec(20, 26, 'PROD-003', 'Control Panel CP-100', 'CP-100', 'MATERIAL', undefined, 'Conductivity', '% IACS', 100, 98.5, 'Lakshmi Rao', 'U-013', 'APPROVED', 'Deepa Reddy', '25', { materialName: 'Copper Wire 1.5mm', materialId: 'MAT-003', supplierName: 'ElectroParts Co.' }),
  rec(21, 24, 'PROD-003', 'Control Panel CP-100', 'CP-100', 'MATERIAL', undefined, 'Thickness', 'mm', 1.6, 1.58, 'Lakshmi Rao', 'U-013', 'APPROVED', 'Deepa Reddy', '23', { materialName: 'FR4 PCB Substrate', materialId: 'MAT-004', supplierName: 'ElectroParts Co.' }),
  rec(22, 12, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'MATERIAL', undefined, 'Viscosity', 'cSt', 150, 128, 'Ravi Patel', 'U-006', 'REJECTED', 'Deepa Reddy', '11', { materialName: 'Bearing Grease NLGI 2', materialId: 'MAT-005', supplierName: 'LubeMax Industries', reviewComment: 'Viscosity well below spec; return shipment.' }),

  // Component inspections
  rec(23, 21, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'COMPONENT', undefined, 'Bearing Clearance', 'mm', 0.02, 0.022, 'Ravi Patel', 'U-006', 'PENDING', undefined, undefined, { componentName: 'Bearing Assembly', componentId: 'COMP-004' }),
  rec(24, 19, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'COMPONENT', undefined, 'Gear Tooth Profile', 'class', 6, 6, 'Ravi Patel', 'U-006', 'APPROVED', 'Suresh Kumar', '18', { componentName: 'Gear Ring', componentId: 'COMP-001' }),

  // Final product
  rec(25, 6, 'PROD-001', 'GearBox Assembly GX-200', 'GX-200', 'FINAL_PRODUCT', undefined, 'Acceptance Test', 'pass', 1, 1, 'Mohammed Yusuf', 'U-008', 'APPROVED', 'Suresh Kumar', '5'),
];

export const initialInspectionPlans: InspectionPlan[] = [
  { id: 'IP-001', planCode: 'MFG-PLAN-001', type: 'MANUFACTURING', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', stageId: 'MFG-001', stageName: 'Machining', parameters: [
    { id: 'P-1', description: 'Measure outer diameter', equipmentId: 'EQP-002', equipmentName: 'Vernier Caliper VC-07', parameterName: 'Outer Diameter', unit: 'mm', targetValue: 50 },
    { id: 'P-2', description: 'Surface roughness check', equipmentId: 'EQP-004', equipmentName: 'Profilometer PR-03', parameterName: 'Surface Roughness Ra', unit: 'µm', targetValue: 1.6 },
  ], inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(25), status: 'ACTIVE', createdBy: 'Suresh Kumar', createdAt: daysAgo(30) },
  { id: 'IP-002', planCode: 'MFG-PLAN-002', type: 'MANUFACTURING', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', stageId: 'MFG-002', stageName: 'Heat Treatment', parameters: [
    { id: 'P-3', description: 'Hardness measurement', equipmentId: 'EQP-001', equipmentName: 'Rockwell Hardness Tester RH-01', parameterName: 'Hardness', unit: 'HRC', targetValue: 58 },
    { id: 'P-4', description: 'Case depth verification', equipmentId: 'EQP-001', equipmentName: 'Rockwell Hardness Tester RH-01', parameterName: 'Case Depth', unit: 'mm', targetValue: 1.2 },
  ], inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(22), status: 'COMPLETED', createdBy: 'Suresh Kumar', createdAt: daysAgo(28) },
  { id: 'IP-003', planCode: 'MFG-PLAN-003', type: 'MANUFACTURING', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', stageId: 'MFG-003', stageName: 'Grinding', parameters: [
    { id: 'P-5', description: 'Roundness check', equipmentId: 'EQP-005', equipmentName: 'Dial Gauge DG-04', parameterName: 'Roundness', unit: 'mm', targetValue: 0.005 },
    { id: 'P-6', description: 'Surface finish verification', equipmentId: 'EQP-004', equipmentName: 'Profilometer PR-03', parameterName: 'Surface Finish', unit: 'µm', targetValue: 0.4 },
  ], inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(20), status: 'ACTIVE', createdBy: 'Suresh Kumar', createdAt: daysAgo(26) },
  { id: 'IP-004', planCode: 'MFG-PLAN-004', type: 'MANUFACTURING', productId: 'PROD-002', productName: 'Shaft Unit SH-400', stageId: 'MFG-004', stageName: 'CNC Turning', parameters: [
    { id: 'P-7', description: 'Length verification', equipmentId: 'EQP-002', equipmentName: 'Vernier Caliper VC-07', parameterName: 'Length', unit: 'mm', targetValue: 450 },
    { id: 'P-8', description: 'Diameter verification', equipmentId: 'EQP-002', equipmentName: 'Vernier Caliper VC-07', parameterName: 'Diameter', unit: 'mm', targetValue: 25 },
  ], inspectorId: 'U-008', inspectorName: 'Mohammed Yusuf', inspectionDate: daysAgo(18), status: 'COMPLETED', createdBy: 'Suresh Kumar', createdAt: daysAgo(24) },
  { id: 'IP-005', planCode: 'ASM-PLAN-001', type: 'ASSEMBLING', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', stageId: 'ASM-001', stageName: 'Sub-Assembly', assemblingResource: 'Priya Das', parameters: [
    { id: 'P-9', description: 'Backlash measurement', equipmentId: 'EQP-005', equipmentName: 'Dial Gauge DG-04', parameterName: 'Backlash', unit: 'mm', targetValue: 0.08 },
    { id: 'P-10', description: 'Gear mesh evaluation', equipmentId: 'EQP-002', equipmentName: 'Vernier Caliper VC-07', parameterName: 'Gear Mesh', unit: 'score', targetValue: 100 },
  ], inspectorId: 'U-007', inspectorName: 'Priya Das', inspectionDate: daysAgo(15), status: 'ACTIVE', createdBy: 'Suresh Kumar', createdAt: daysAgo(22) },
  { id: 'IP-006', planCode: 'ASM-PLAN-002', type: 'ASSEMBLING', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', stageId: 'ASM-002', stageName: 'Final Assembly', assemblingResource: 'Mohammed Yusuf', parameters: [
    { id: 'P-11', description: 'Noise level measurement', equipmentId: 'EQP-010', equipmentName: 'Digital Multimeter DM-02', parameterName: 'Noise Level', unit: 'dB', targetValue: 75 },
  ], status: 'DRAFT', createdBy: 'Suresh Kumar', createdAt: daysAgo(3) },
  { id: 'IP-007', planCode: 'MAT-PLAN-001', type: 'MATERIAL', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', materialName: 'EN24 Alloy Steel', materialId: 'MAT-001', supplierName: 'SteelTech Pvt. Ltd.', supplierId: 'SUP-001', parameters: [
    { id: 'P-12', description: 'Hardness test on incoming batch', equipmentId: 'EQP-001', equipmentName: 'Rockwell Hardness Tester RH-01', parameterName: 'Hardness', unit: 'HRC', targetValue: 32 },
    { id: 'P-13', description: 'Verify grade certificate', equipmentId: 'EQP-002', equipmentName: 'Vernier Caliper VC-07', parameterName: 'Grade Certificate', unit: 'pass', targetValue: 1 },
  ], inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(30), status: 'COMPLETED', createdBy: 'Suresh Kumar', createdAt: daysAgo(35) },
  { id: 'IP-008', planCode: 'COMP-PLAN-001', type: 'COMPONENT', productId: 'PROD-001', productName: 'GearBox Assembly GX-200', componentName: 'Bearing Assembly', componentId: 'COMP-004', materialType: 'Semi-Finished', parameters: [
    { id: 'P-14', description: 'Bearing clearance measurement', equipmentId: 'EQP-005', equipmentName: 'Dial Gauge DG-04', parameterName: 'Bearing Clearance', unit: 'mm', targetValue: 0.02 },
  ], inspectorId: 'U-006', inspectorName: 'Ravi Patel', inspectionDate: daysAgo(21), status: 'SUBMITTED', createdBy: 'Suresh Kumar', createdAt: daysAgo(25) },
];

export const initialResourceAssignments: ResourceAssignment[] = [
  { id: 'RA-001', inspectorId: 'U-006', inspectorName: 'Ravi Patel',      planId: 'IP-001', planType: 'MFG-PLAN-001', productName: 'GearBox GX-200', stageName: 'Machining',      assignedDate: daysAgo(25), status: 'COMPLETED' },
  { id: 'RA-002', inspectorId: 'U-006', inspectorName: 'Ravi Patel',      planId: 'IP-003', planType: 'MFG-PLAN-003', productName: 'GearBox GX-200', stageName: 'Grinding',       assignedDate: daysAgo(20), status: 'IN_PROGRESS' },
  { id: 'RA-003', inspectorId: 'U-007', inspectorName: 'Priya Das',       planId: 'IP-005', planType: 'ASM-PLAN-001', productName: 'GearBox GX-200', stageName: 'Sub-Assembly',  assignedDate: daysAgo(15), status: 'IN_PROGRESS' },
  { id: 'RA-004', inspectorId: 'U-008', inspectorName: 'Mohammed Yusuf',  planId: 'IP-004', planType: 'MFG-PLAN-004', productName: 'Shaft SH-400',   stageName: 'CNC Turning',   assignedDate: daysAgo(18), status: 'COMPLETED' },
  { id: 'RA-005', inspectorId: 'U-013', inspectorName: 'Lakshmi Rao',     planId: 'IP-007', planType: 'MAT-PLAN-001', productName: 'GearBox GX-200', stageName: 'Material QA',    assignedDate: daysAgo(2),  status: 'ASSIGNED' },
  { id: 'RA-006', inspectorId: 'U-014', inspectorName: 'Nikhil Joshi',    planId: 'IP-008', planType: 'COMP-PLAN-001', productName: 'GearBox GX-200', stageName: 'Component QA',  assignedDate: daysAgo(1),  status: 'ASSIGNED' },
];

export const initialSupplierEvaluations: SupplierEvaluation[] = [
  { id: 'SE-001', supplierId: 'SUP-001', supplierName: 'SteelTech Pvt. Ltd.', evaluationDate: daysAgo(30), qualityRating: 9, deliveryRating: 6, quantityRating: 9, qualityStatus: 'GREEN', deliveryStatus: 'AMBER', quantityStatus: 'GREEN', overallStatus: 'AMBER', evaluatedBy: 'Kavitha Nair', approvedBy: 'Arjun Mehta', approvalStatus: 'APPROVED', comments: 'Strong quality. Delivery delays during festival season.' },
  { id: 'SE-002', supplierId: 'SUP-002', supplierName: 'BearingWorld Inc.',   evaluationDate: daysAgo(28), qualityRating: 8, deliveryRating: 8, quantityRating: 8, qualityStatus: 'GREEN', deliveryStatus: 'GREEN', quantityStatus: 'GREEN', overallStatus: 'GREEN', evaluatedBy: 'Kavitha Nair', approvedBy: 'Arjun Mehta', approvalStatus: 'APPROVED', comments: 'Excellent overall performance.' },
  { id: 'SE-003', supplierId: 'SUP-003', supplierName: 'ElectroParts Co.',    evaluationDate: daysAgo(20), qualityRating: 7, deliveryRating: 9, quantityRating: 7, qualityStatus: 'AMBER', deliveryStatus: 'GREEN', quantityStatus: 'AMBER', overallStatus: 'AMBER', evaluatedBy: 'Kavitha Nair', approvalStatus: 'PENDING', comments: 'Two batches required rework — monitor closely.' },
  { id: 'SE-004', supplierId: 'SUP-004', supplierName: 'LubeMax Industries',  evaluationDate: daysAgo(12), qualityRating: 3, deliveryRating: 5, quantityRating: 8, qualityStatus: 'RED',   deliveryStatus: 'AMBER', quantityStatus: 'GREEN', overallStatus: 'RED',   evaluatedBy: 'Kavitha Nair', approvedBy: 'Arjun Mehta', approvalStatus: 'REJECTED', comments: 'Viscosity issue caused rejection. Vendor under review.' },
];
