import 'dotenv/config';
import { connectDB } from './db';
import mongoose from 'mongoose';
import { Organization }      from './models/Organization';
import { User }              from './models/User';
import { Department }        from './models/Department';
import { Equipment }         from './models/Equipment';
import { InspectionType }    from './models/InspectionType';
import { ManufacturingStage }from './models/ManufacturingStage';
import { AssemblyStage }     from './models/AssemblyStage';
import { Supplier }          from './models/Supplier';
import { Material }          from './models/Material';
import { MaterialType }      from './models/MaterialType';
import { InspectionMethod }  from './models/InspectionMethod';
import { Role }              from './models/Role';
import { SupplierEvalMethod }from './models/SupplierEvalMethod';
import { Component }         from './models/Component';
import { Product }           from './models/Product';
import { InspectionPlan }    from './models/InspectionPlan';
import { InspectionReport }  from './models/InspectionReport';
import { ProductQualityPlan }from './models/ProductQualityPlan';
import { SupplierEvaluation }from './models/SupplierEvaluation';
import { ProductionPlan }    from './models/ProductionPlan';
import { MfgDocument }       from './models/MfgDocument';
import { CalibrationRecord } from './models/CalibrationRecord';
import { AuditLogEntry }     from './models/AuditLogEntry';
import { AIAuditLog }        from './models/AIAuditLog';
import type { UserRole } from './models/User';
import type { IPermission } from './models/Role';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

async function seed() {
  await connectDB();
  console.log('\n🌱 Seeding AssessSphere...\n');

  const org = await Organization.findOneAndUpdate(
    { name: 'QMICS Solutions Manufacturing' },
    { name: 'QMICS Solutions Manufacturing', industry: 'Industrial Manufacturing', contactEmail: 'info@qmicsgroup.com', contactPhone: '+91 9849499111' },
    { upsert: true, returnDocument: 'after' }
  );
  console.log(`✓ Organization: ${org.name} (${org._id})`);

  const users: { name: string; email: string; password: string; role: UserRole }[] = [
    { name: 'System Admin',       email: 'admin@qmics.com',       password: 'Admin@2025',  role: 'Admin' },
    { name: 'Management Director',email: 'management@qmics.com',  password: 'Mgmt@2025',   role: 'Management' },
    { name: 'Production Manager', email: 'production@qmics.com',  password: 'Prod@2025',   role: 'ProductionManager' },
    { name: 'Stores Manager',     email: 'stores@qmics.com',      password: 'Store@2025',  role: 'StoresManager' },
    { name: 'Quality Manager',    email: 'quality@qmics.com',     password: 'Qual@2025',   role: 'QualityManager' },
    { name: 'Inspector Ravi',     email: 'inspector@qmics.com',   password: 'Insp@2025',   role: 'Inspector' },
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) { await User.create({ ...u, organization: org._id }); console.log(`  ✓ User: ${u.name} [${u.role}]`); }
    else console.log(`  ~ Exists: ${u.name}`);
  }

  // Reload every seeded user once so downstream sections can reference real ObjectIds by role.
  const allUsers = await User.find({ organization: org._id });
  const userByEmail = Object.fromEntries(allUsers.map((u) => [u.email, u]));
  const admin      = userByEmail['admin@qmics.com'];
  const management = userByEmail['management@qmics.com'];
  const production = userByEmail['production@qmics.com'];
  const stores      = userByEmail['stores@qmics.com'];
  const quality     = userByEmail['quality@qmics.com'];
  const inspector   = userByEmail['inspector@qmics.com'];

  const departments = [
    { name: 'Production',            head: production },
    { name: 'Quality Assurance',     head: quality },
    { name: 'Stores & Procurement',  head: stores },
    { name: 'Management',            head: management },
    { name: 'Administration',        head: admin },
  ];
  for (const d of departments) {
    await Department.findOneAndUpdate(
      { name: d.name, organization: org._id },
      { name: d.name, head: d.head._id, organization: org._id, isActive: true },
      { upsert: true }
    );
  }
  console.log(`✓ Departments: ${departments.length}`);

  const inspTypes = [
    { name: 'Incoming Material Inspection',       category: 'INCOMING_MATERIAL' },
    { name: 'In-Process Manufacturing Inspection',category: 'IN_PROCESS' },
    { name: 'Component Dimensional Inspection',   category: 'COMPONENT' },
    { name: 'Final Product Inspection',           category: 'FINAL_PRODUCT' },
    { name: 'Equipment Calibration',              category: 'CALIBRATION' },
  ];
  for (const t of inspTypes) {
    await InspectionType.findOneAndUpdate({ name: t.name, organization: org._id }, { ...t, organization: org._id }, { upsert: true });
  }
  console.log(`✓ Inspection Types: ${inspTypes.length}`);

  const mfgStages = [
    { name: 'Raw Material Preparation', sequence: 1 },
    { name: 'Machining',                sequence: 2 },
    { name: 'Heat Treatment',           sequence: 3 },
    { name: 'Surface Finishing',        sequence: 4 },
    { name: 'Grinding',                 sequence: 5 },
    { name: 'Quality Check',            sequence: 6 },
  ];
  for (const s of mfgStages) {
    await ManufacturingStage.findOneAndUpdate({ name: s.name, organization: org._id }, { ...s, organization: org._id }, { upsert: true });
  }
  console.log(`✓ Manufacturing Stages: ${mfgStages.length}`);

  const asmStages = [
    { name: 'Sub-Assembly 1',  sequence: 1 },
    { name: 'Sub-Assembly 2',  sequence: 2 },
    { name: 'Final Assembly',  sequence: 3 },
    { name: 'Functional Test', sequence: 4 },
  ];
  for (const s of asmStages) {
    await AssemblyStage.findOneAndUpdate({ name: s.name, organization: org._id }, { ...s, organization: org._id }, { upsert: true });
  }
  console.log(`✓ Assembly Stages: ${asmStages.length}`);

  const equipment = [
    { name: 'Vernier Caliper VC-07',          type: 'Measurement',           calibrationStatus: 'COMPLETED', calibrationFrequencyDays: 90,  nextCalibrationDate: daysFromNow(60) },
    { name: 'Rockwell Hardness Tester RHT-12',type: 'Hardness Testing',       calibrationStatus: 'COMPLETED', calibrationFrequencyDays: 180, nextCalibrationDate: daysFromNow(120) },
    { name: 'CMM Machine CMM-03',             type: 'Coordinate Measurement', calibrationStatus: 'PENDING',   calibrationFrequencyDays: 365, nextCalibrationDate: daysFromNow(5) },
    { name: 'Torque Wrench TW-05',            type: 'Torque Measurement',     calibrationStatus: 'COMPLETED', calibrationFrequencyDays: 180, nextCalibrationDate: daysFromNow(90) },
    { name: 'Micrometer MIC-09',              type: 'Measurement',            calibrationStatus: 'OVERDUE',   calibrationFrequencyDays: 90,  nextCalibrationDate: daysAgo(5) },
  ];
  for (const e of equipment) {
    await Equipment.findOneAndUpdate({ name: e.name, organization: org._id }, { ...e, isActive: true, organization: org._id }, { upsert: true });
  }
  console.log(`✓ Equipment: ${equipment.length}`);

  const suppliers = [
    { name: 'SteelTech Metals Pvt Ltd',  category: 'Raw Materials', approvalStatus: 'APPROVED',  overallRating: 8.5, qualityRating: 9.0, deliveryRating: 8.0 },
    { name: 'Precision Components Ltd',  category: 'Components',   approvalStatus: 'APPROVED',  overallRating: 7.8, qualityRating: 8.2, deliveryRating: 7.4 },
    { name: 'FastFix Hardware',          category: 'Hardware',     approvalStatus: 'APPROVED',  overallRating: 9.1, qualityRating: 9.3, deliveryRating: 8.9 },
    { name: 'ChemPro Coatings',          category: 'Chemicals',    approvalStatus: 'PENDING',   overallRating: 6.2, qualityRating: 6.5, deliveryRating: 5.9 },
    { name: 'RubberTech Seals',          category: 'Seals',        approvalStatus: 'SUSPENDED', overallRating: 4.5, qualityRating: 4.2, deliveryRating: 4.8 },
  ];
  for (const s of suppliers) {
    await Supplier.findOneAndUpdate({ name: s.name, organization: org._id }, { ...s, organization: org._id }, { upsert: true });
  }
  // After materials are created (below) we'll link them back to suppliers.
  console.log(`✓ Suppliers: ${suppliers.length}`);

  const matTypes = ['Steel','Aluminium','Rubber','Chemical','Electrical','Composite'];
  for (const name of matTypes) {
    await MaterialType.findOneAndUpdate({ name, organization: org._id }, { name, organization: org._id }, { upsert: true });
  }
  const matTypeBy = Object.fromEntries((await MaterialType.find({ organization: org._id })).map((t) => [t.name, t]));

  // Materials — each linked to a MaterialType and assigned a meaningful materialType ref.
  const materialDefs = [
    { name: 'Carbon Steel Grade 1045', unit: 'kg',    typeName: 'Steel' },
    { name: 'Stainless Steel SS316',   unit: 'kg',    typeName: 'Steel' },
    { name: 'Aluminium Alloy 6061',    unit: 'kg',    typeName: 'Aluminium' },
    { name: 'Rubber Compound RC-45',   unit: 'liters',typeName: 'Rubber' },
    { name: 'Bearing Steel AISI 52100',unit: 'kg',    typeName: 'Steel' },
  ];
  for (const m of materialDefs) {
    await Material.findOneAndUpdate(
      { name: m.name, organization: org._id },
      { name: m.name, unit: m.unit, materialType: matTypeBy[m.typeName]?._id, inspectionRequired: true, organization: org._id },
      { upsert: true }
    );
  }
  console.log(`✓ Materials: ${materialDefs.length}`);

  const methods = [
    { name: 'Visual Inspection',       standard: 'ISO 2859' },
    { name: 'Dimensional Check',       standard: 'ASME Y14.5' },
    { name: 'Hardness Test',           standard: 'ASTM E18' },
    { name: 'Tensile Strength Test',   standard: 'ASTM E8' },
    { name: 'Surface Roughness Check', standard: 'ISO 4287' },
  ];
  for (const m of methods) {
    await InspectionMethod.findOneAndUpdate({ name: m.name, organization: org._id }, { ...m, organization: org._id }, { upsert: true });
  }
  console.log(`✓ Inspection Methods: ${methods.length}`);

  const allPerm = (v: boolean): IPermission => ({ view: v, create: v, edit: v, delete: v });
  const viewOnly = (): IPermission => ({ view: true, create: false, edit: false, delete: false });
  const noAccess = (): IPermission => ({ view: false, create: false, edit: false, delete: false });
  const roles: { name: string; description: string; isSystem: boolean; permissions: Record<string, IPermission> }[] = [
    { name: 'Admin', description: 'Full system access and configuration', isSystem: true, permissions: { '*': allPerm(true) } },
    { name: 'Management', description: 'Read-only access to all modules with insights', isSystem: true, permissions: { '*': viewOnly() } },
    { name: 'ProductionManager', description: 'Manages products, components and manufacturing stages', isSystem: true, permissions: { '*': viewOnly(), Products: allPerm(true), Components: allPerm(true), 'Manufacturing Stages': allPerm(true) } },
    { name: 'StoresManager', description: 'Manages materials and supplier relationships', isSystem: true, permissions: { '*': viewOnly(), Materials: allPerm(true), 'Material Types': allPerm(true), Suppliers: allPerm(true) } },
    { name: 'QualityManager', description: 'Manages quality inspection workflows', isSystem: true, permissions: { '*': viewOnly(), 'Inspection Types': allPerm(true), Equipment: allPerm(true), 'Inspection Methods': allPerm(true), Documents: allPerm(true) } },
    { name: 'Inspector', description: 'Performs inspections and equipment monitoring', isSystem: true, permissions: { '*': noAccess(), Equipment: viewOnly() } },
  ];
  for (const r of roles) {
    await Role.findOneAndUpdate({ name: r.name, organization: org._id }, { ...r, organization: org._id }, { upsert: true });
  }
  console.log(`✓ Roles: ${roles.length}`);

  const evalMethods = [
    { name: 'Quality Rating',    description: 'Rate supplier quality on a 1-10 scale based on rejection rate', isSystem: true },
    { name: 'On-time Delivery',  description: 'Percentage of orders delivered on or before agreed date',       isSystem: true },
    { name: 'Quantity Accuracy', description: 'Percentage of orders with accurate quantities matching PO',     isSystem: true },
    { name: 'Response Time',     description: 'Average response time to quotation requests and queries',       isSystem: false },
    { name: 'Documentation',     description: 'Compliance with required documentation and certificates',        isSystem: false },
  ];
  for (const m of evalMethods) {
    await SupplierEvalMethod.findOneAndUpdate({ name: m.name, organization: org._id }, { ...m, organization: org._id }, { upsert: true });
  }
  console.log(`✓ Supplier Eval Methods: ${evalMethods.length}`);

  // ── Reload everything seeded above so the workflow data below can reference real ObjectIds ──
  const matBy = Object.fromEntries((await Material.find({ organization: org._id })).map((m) => [m.name, m]));
  const supBy = Object.fromEntries((await Supplier.find({ organization: org._id })).map((s) => [s.name, s]));
  const mfgBy = Object.fromEntries((await ManufacturingStage.find({ organization: org._id })).map((s) => [s.name, s]));
  const asmBy = Object.fromEntries((await AssemblyStage.find({ organization: org._id })).map((s) => [s.name, s]));
  const typeBy = Object.fromEntries((await InspectionType.find({ organization: org._id })).map((t) => [t.category, t]));
  const methodBy = Object.fromEntries((await InspectionMethod.find({ organization: org._id })).map((m) => [m.name, m]));
  const equipBy = Object.fromEntries((await Equipment.find({ organization: org._id })).map((e) => [e.name, e]));

  // ── Components ───────────────────────────────────────────────────────────────
  const componentDefs = [
    { name: 'Steel Shaft',            material: 'Carbon Steel Grade 1045',  supplier: 'SteelTech Metals Pvt Ltd' },
    { name: 'Bearing Assembly',       material: 'Bearing Steel AISI 52100', supplier: 'Precision Components Ltd' },
    { name: 'Rubber Gasket',          material: 'Rubber Compound RC-45',    supplier: 'RubberTech Seals' },
    { name: 'Housing Cover',          material: 'Aluminium Alloy 6061',     supplier: 'Precision Components Ltd' },
    { name: 'Fastener Kit',           material: 'Carbon Steel Grade 1045',  supplier: 'FastFix Hardware' },
    { name: 'Control Circuit Board',  material: 'Aluminium Alloy 6061',     supplier: 'FastFix Hardware' },
  ];
  for (const c of componentDefs) {
    await Component.findOneAndUpdate(
      { name: c.name, organization: org._id },
      { name: c.name, material: matBy[c.material]._id, primarySupplier: supBy[c.supplier]._id, inspectionRequired: true, organization: org._id },
      { upsert: true }
    );
  }
  const compBy = Object.fromEntries((await Component.find({ organization: org._id })).map((c) => [c.name, c]));
  console.log(`✓ Components: ${componentDefs.length}`);

  // ── Products ─────────────────────────────────────────────────────────────────
  const productDefs = [
    {
      name: 'GearBox GX-200', category: 'Power Transmission', status: 'ACTIVE' as const,
      components: ['Steel Shaft', 'Bearing Assembly', 'Housing Cover'],
      mfg: ['Raw Material Preparation', 'Machining', 'Heat Treatment', 'Grinding', 'Quality Check'],
      asm: ['Sub-Assembly 1', 'Sub-Assembly 2', 'Final Assembly', 'Functional Test'],
    },
    {
      name: 'Precision Valve Assembly PV-450', category: 'Fluid Control', status: 'ACTIVE' as const,
      components: ['Rubber Gasket', 'Fastener Kit'],
      mfg: ['Raw Material Preparation', 'Machining', 'Surface Finishing'],
      asm: ['Sub-Assembly 1', 'Final Assembly'],
    },
    {
      name: 'Industrial Pump IP-750', category: 'Fluid Handling', status: 'ACTIVE' as const,
      components: ['Steel Shaft', 'Housing Cover', 'Fastener Kit', 'Control Circuit Board'],
      mfg: ['Machining', 'Heat Treatment', 'Grinding', 'Quality Check'],
      asm: ['Sub-Assembly 1', 'Sub-Assembly 2', 'Final Assembly'],
    },
  ];
  for (const p of productDefs) {
    await Product.findOneAndUpdate(
      { name: p.name, organization: org._id },
      {
        name: p.name, category: p.category, status: p.status,
        description: `${p.name} - ${p.category.toLowerCase()} product line.`,
        components: p.components.map((n) => compBy[n]._id),
        manufacturingStages: p.mfg.map((n) => mfgBy[n]._id),
        assemblyStages: p.asm.map((n) => asmBy[n]._id),
        createdBy: production._id,
        organization: org._id,
      },
      { upsert: true }
    );
  }
  const prodBy = Object.fromEntries((await Product.find({ organization: org._id })).map((p) => [p.name, p]));
  console.log(`✓ Products: ${productDefs.length}`);

  // ── Inspection Plans (checklists per stage, matching the app's R1-R5 workflow) ──
  const gearbox = prodBy['GearBox GX-200'];
  const valve   = prodBy['Precision Valve Assembly PV-450'];
  const pump    = prodBy['Industrial Pump IP-750'];

  const dimCheck = methodBy['Dimensional Check'];
  const hardness = methodBy['Hardness Test'];
  const visual   = methodBy['Visual Inspection'];
  const roughness= methodBy['Surface Roughness Check'];
  const caliper  = equipBy['Vernier Caliper VC-07'];
  const rockwell = equipBy['Rockwell Hardness Tester RHT-12'];

  const planDefs: any[] = [
    {
      key: 'mat-steel', planType: 'R1_MATERIAL', title: 'Carbon Steel Incoming Inspection',
      material: matBy['Carbon Steel Grade 1045']._id, inspectionType: typeBy['INCOMING_MATERIAL']._id,
      checklistTemplate: [
        { parameter: 'Chemical Composition', specificationValue: 'Per ASTM A29', mandatory: true, sequence: 1 },
        { parameter: 'Visual Surface Check', specificationValue: 'No rust/pitting', inspectionMethod: visual._id, mandatory: true, sequence: 2 },
      ],
      status: 'ACTIVE',
    },
    {
      key: 'comp-shaft', planType: 'R2_COMPONENT', title: 'Steel Shaft Dimensional Inspection',
      component: compBy['Steel Shaft']._id, inspectionType: typeBy['COMPONENT']._id,
      checklistTemplate: [
        { parameter: 'Shaft Diameter', specificationValue: '50.00mm', toleranceMin: '49.90', toleranceMax: '50.10', unit: 'mm', inspectionMethod: dimCheck._id, equipment: caliper._id, mandatory: true, sequence: 1 },
        { parameter: 'Surface Hardness', specificationValue: '60 HRC', toleranceMin: '58', toleranceMax: '62', unit: 'HRC', inspectionMethod: hardness._id, equipment: rockwell._id, mandatory: true, sequence: 2 },
      ],
      status: 'ACTIVE',
    },
    {
      key: 'mfg-gearbox', planType: 'R3_MANUFACTURING', title: 'GearBox GX-200 Manufacturing Inspection',
      product: gearbox._id, manufacturingStage: mfgBy['Machining']._id, inspectionType: typeBy['IN_PROCESS']._id,
      checklistTemplate: [
        { parameter: 'Shaft Diameter', specificationValue: '50.00mm', toleranceMin: '49.90', toleranceMax: '50.10', unit: 'mm', inspectionMethod: dimCheck._id, equipment: caliper._id, mandatory: true, sequence: 1 },
        { parameter: 'Surface Hardness', specificationValue: '60 HRC', toleranceMin: '58', toleranceMax: '62', unit: 'HRC', inspectionMethod: hardness._id, equipment: rockwell._id, mandatory: true, sequence: 2 },
        { parameter: 'Visual Inspection', specificationValue: 'No visible defects', inspectionMethod: visual._id, mandatory: true, sequence: 3 },
        { parameter: 'Surface Roughness', specificationValue: 'Ra 1.6 μm max', unit: 'μm', inspectionMethod: roughness._id, mandatory: false, sequence: 4 },
      ],
      status: 'ACTIVE',
    },
    {
      key: 'mfg-valve', planType: 'R3_MANUFACTURING', title: 'Precision Valve PV-450 Manufacturing Inspection',
      product: valve._id, manufacturingStage: mfgBy['Machining']._id, inspectionType: typeBy['IN_PROCESS']._id,
      checklistTemplate: [
        { parameter: 'Bore Diameter', specificationValue: '25.00mm', toleranceMin: '24.95', toleranceMax: '25.05', unit: 'mm', inspectionMethod: dimCheck._id, equipment: caliper._id, mandatory: true, sequence: 1 },
        { parameter: 'Visual Inspection', specificationValue: 'No visible defects', inspectionMethod: visual._id, mandatory: true, sequence: 2 },
      ],
      status: 'ACTIVE',
    },
    {
      key: 'asm-gearbox', planType: 'R4_ASSEMBLY', title: 'GearBox GX-200 Assembly Inspection',
      product: gearbox._id, assemblyStage: asmBy['Final Assembly']._id, inspectionType: typeBy['IN_PROCESS']._id,
      checklistTemplate: [
        { parameter: 'Torque - Housing Bolts', specificationValue: '45 Nm', toleranceMin: '43', toleranceMax: '47', unit: 'Nm', mandatory: true, sequence: 1 },
        { parameter: 'Functional Rotation Test', specificationValue: 'Smooth, no binding', mandatory: true, sequence: 2 },
      ],
      status: 'ACTIVE',
    },
    {
      key: 'asm-pump', planType: 'R4_ASSEMBLY', title: 'Industrial Pump IP-750 Assembly Inspection',
      product: pump._id, assemblyStage: asmBy['Sub-Assembly 2']._id, inspectionType: typeBy['IN_PROCESS']._id,
      checklistTemplate: [
        { parameter: 'Seal Integrity', specificationValue: 'No leakage @ 10 bar', mandatory: true, sequence: 1 },
        { parameter: 'Visual Inspection', specificationValue: 'No visible defects', inspectionMethod: visual._id, mandatory: true, sequence: 2 },
      ],
      status: 'ACTIVE',
    },
    {
      key: 'final-gearbox', planType: 'R5_FINAL', title: 'GearBox GX-200 Final Product Inspection',
      product: gearbox._id, inspectionType: typeBy['FINAL_PRODUCT']._id,
      checklistTemplate: [
        { parameter: 'Overall Dimensions', specificationValue: 'Per drawing GX200-A', inspectionMethod: dimCheck._id, mandatory: true, sequence: 1 },
        { parameter: 'Functional Test', specificationValue: 'Pass @ rated load', mandatory: true, sequence: 2 },
        { parameter: 'Visual/Cosmetic Check', specificationValue: 'No visible defects', inspectionMethod: visual._id, mandatory: true, sequence: 3 },
      ],
      status: 'ACTIVE',
    },
    {
      key: 'final-valve', planType: 'R5_FINAL', title: 'Precision Valve PV-450 Final Inspection',
      product: valve._id, inspectionType: typeBy['FINAL_PRODUCT']._id,
      checklistTemplate: [
        { parameter: 'Pressure Test', specificationValue: 'Hold 15 bar / 5 min', mandatory: true, sequence: 1 },
        { parameter: 'Visual/Cosmetic Check', specificationValue: 'No visible defects', inspectionMethod: visual._id, mandatory: true, sequence: 2 },
      ],
      status: 'COMPLETED',
    },
  ];

  for (const p of planDefs) {
    await InspectionPlan.findOneAndUpdate(
      { title: p.title, organization: org._id },
      {
        planType: p.planType, title: p.title,
        product: p.product, material: p.material, component: p.component,
        manufacturingStage: p.manufacturingStage, assemblyStage: p.assemblyStage,
        inspectionType: p.inspectionType,
        checklistTemplate: p.checklistTemplate,
        assignedInspectors: [inspector._id],
        status: p.status,
        dueDate: daysFromNow(14),
        frequency: 'Per Batch',
        createdBy: quality._id,
        organization: org._id,
      },
      { upsert: true }
    );
  }
  const planBy = Object.fromEntries((await InspectionPlan.find({ organization: org._id })).map((p) => [p.title, p]));
  console.log(`✓ Inspection Plans: ${planDefs.length}`);

  // ── Inspection Reports (varied outcomes/statuses so review queues have real content) ──
  type ReportDef = {
    plan: string; status: 'DRAFT'|'SUBMITTED'|'UNDER_REVIEW'|'APPROVED'|'REJECTED'|'ON_HOLD'; daysBack: number;
    results: { parameter: string; specificationValue: string; actualValue: string; result: 'PASS'|'FAIL'|'MARGINAL'|'NA'; observations?: string }[];
    approvedBy?: any; reviewedBy?: any; l1ReviewedBy?: any; rejectionReason?: string;
  };
  const reportDefs: ReportDef[] = [
    {
      plan: 'GearBox GX-200 Manufacturing Inspection', status: 'APPROVED', daysBack: 6,
      results: [
        { parameter: 'Shaft Diameter', specificationValue: '50.00mm', actualValue: '49.98mm', result: 'PASS' },
        { parameter: 'Surface Hardness', specificationValue: '60 HRC', actualValue: '60 HRC', result: 'PASS' },
        { parameter: 'Visual Inspection', specificationValue: 'No visible defects', actualValue: 'No defects', result: 'PASS' },
        { parameter: 'Surface Roughness', specificationValue: 'Ra 1.6 μm max', actualValue: 'Ra 1.4 μm', result: 'PASS' },
      ],
      approvedBy: quality, reviewedBy: production,
    },
    {
      plan: 'GearBox GX-200 Manufacturing Inspection', status: 'UNDER_REVIEW', daysBack: 1,
      results: [
        { parameter: 'Shaft Diameter', specificationValue: '50.00mm', actualValue: '49.85mm', result: 'MARGINAL', observations: 'Slightly below lower tolerance' },
        { parameter: 'Surface Hardness', specificationValue: '60 HRC', actualValue: '55 HRC', result: 'FAIL', observations: 'Below minimum hardness - heat treatment issue suspected' },
        { parameter: 'Visual Inspection', specificationValue: 'No visible defects', actualValue: 'No defects', result: 'PASS' },
        { parameter: 'Surface Roughness', specificationValue: 'Ra 1.6 μm max', actualValue: 'Ra 1.4 μm', result: 'PASS' },
      ],
      l1ReviewedBy: production,
    },
    {
      plan: 'GearBox GX-200 Assembly Inspection', status: 'SUBMITTED', daysBack: 2,
      results: [
        { parameter: 'Torque - Housing Bolts', specificationValue: '45 Nm', actualValue: '44.5 Nm', result: 'PASS' },
        { parameter: 'Functional Rotation Test', specificationValue: 'Smooth, no binding', actualValue: 'Smooth', result: 'PASS' },
      ],
    },
    {
      plan: 'GearBox GX-200 Final Product Inspection', status: 'APPROVED', daysBack: 4,
      results: [
        { parameter: 'Overall Dimensions', specificationValue: 'Per drawing GX200-A', actualValue: 'Conforms', result: 'PASS' },
        { parameter: 'Functional Test', specificationValue: 'Pass @ rated load', actualValue: 'Pass', result: 'PASS' },
        { parameter: 'Visual/Cosmetic Check', specificationValue: 'No visible defects', actualValue: 'No defects', result: 'PASS' },
      ],
      approvedBy: quality, reviewedBy: quality,
    },
    {
      plan: 'Precision Valve PV-450 Manufacturing Inspection', status: 'REJECTED', daysBack: 3,
      results: [
        { parameter: 'Bore Diameter', specificationValue: '25.00mm', actualValue: '25.20mm', result: 'FAIL', observations: 'Bore oversize — tooling wear suspected' },
        { parameter: 'Visual Inspection', specificationValue: 'No visible defects', actualValue: 'Minor tooling marks', result: 'MARGINAL' },
      ],
      rejectionReason: 'Bore diameter out of tolerance — rework and resubmit.',
    },
    {
      plan: 'Precision Valve PV-450 Final Inspection', status: 'APPROVED', daysBack: 10,
      results: [
        { parameter: 'Pressure Test', specificationValue: 'Hold 15 bar / 5 min', actualValue: 'Held, no drop', result: 'PASS' },
        { parameter: 'Visual/Cosmetic Check', specificationValue: 'No visible defects', actualValue: 'No defects', result: 'PASS' },
      ],
      approvedBy: quality, reviewedBy: quality,
    },
    {
      plan: 'Industrial Pump IP-750 Assembly Inspection', status: 'ON_HOLD', daysBack: 1,
      results: [
        { parameter: 'Seal Integrity', specificationValue: 'No leakage @ 10 bar', actualValue: 'Slight seep at flange', result: 'MARGINAL', observations: 'Requires retorque and retest' },
        { parameter: 'Visual Inspection', specificationValue: 'No visible defects', actualValue: 'No defects', result: 'PASS' },
      ],
    },
    {
      plan: 'Steel Shaft Dimensional Inspection', status: 'APPROVED', daysBack: 8,
      results: [
        { parameter: 'Shaft Diameter', specificationValue: '50.00mm', actualValue: '50.02mm', result: 'PASS' },
        { parameter: 'Surface Hardness', specificationValue: '60 HRC', actualValue: '61 HRC', result: 'PASS' },
      ],
      approvedBy: quality, reviewedBy: quality,
    },
    {
      plan: 'Carbon Steel Incoming Inspection', status: 'APPROVED', daysBack: 12,
      results: [
        { parameter: 'Chemical Composition', specificationValue: 'Per ASTM A29', actualValue: 'Conforms', result: 'PASS' },
        { parameter: 'Visual Surface Check', specificationValue: 'No rust/pitting', actualValue: 'Clean surface', result: 'PASS' },
      ],
      approvedBy: quality, reviewedBy: stores,
    },
    // ── Additional SUBMITTED reports so review queues have pending data ──────
    {
      plan: 'Precision Valve PV-450 Manufacturing Inspection', status: 'SUBMITTED', daysBack: 1,
      results: [
        { parameter: 'Bore Diameter', specificationValue: '25.00mm', actualValue: '25.05mm', result: 'MARGINAL', observations: 'Near upper tolerance limit, acceptable for this batch' },
        { parameter: 'Surface Finish', specificationValue: 'Ra 0.8 μm max', actualValue: 'Ra 0.9 μm', result: 'MARGINAL', observations: 'Slightly above limit' },
        { parameter: 'Visual Inspection', specificationValue: 'No visible defects', actualValue: 'No defects', result: 'PASS' },
      ],
    },
    {
      plan: 'GearBox GX-200 Manufacturing Inspection', status: 'SUBMITTED', daysBack: 1,
      results: [
        { parameter: 'Housing Bore', specificationValue: '80.00mm ±0.02', actualValue: '79.99mm', result: 'PASS' },
        { parameter: 'Surface Hardness', specificationValue: '55 HRC min', actualValue: '54 HRC', result: 'MARGINAL', observations: 'Slightly below minimum, re-treatment recommended' },
        { parameter: 'Weld Quality', specificationValue: 'Visual + UT - No porosity', actualValue: 'Minor porosity on seam weld', result: 'FAIL', observations: 'Requires repair weld and retest' },
      ],
    },
    {
      plan: 'Steel Shaft Dimensional Inspection', status: 'SUBMITTED', daysBack: 2,
      results: [
        { parameter: 'Alloy Composition', specificationValue: 'Al 6061-T6', actualValue: 'Al 6061-T6 confirmed', result: 'PASS' },
        { parameter: 'Tensile Strength', specificationValue: '310 MPa min', actualValue: '295 MPa', result: 'FAIL', observations: 'Below minimum tensile strength - batch from new supplier' },
        { parameter: 'Dimensional Check', specificationValue: 'Per drawing', actualValue: 'Conforms', result: 'PASS' },
      ],
    },

    {
      plan: 'Carbon Steel Incoming Inspection', status: 'SUBMITTED', daysBack: 1,
      results: [
        { parameter: 'Chemical Composition', specificationValue: 'Per ASTM A29', actualValue: 'Conforms', result: 'PASS' },
        { parameter: 'Hardness', specificationValue: '160-200 HB', actualValue: '188 HB', result: 'PASS' },
        { parameter: 'Surface Condition', specificationValue: 'No corrosion or pitting', actualValue: 'Light mill scale — acceptable', result: 'PASS' },
        { parameter: 'Dimensional Check', specificationValue: 'Length ±5mm', actualValue: 'Conforms', result: 'PASS' },
      ],
    },
    {
      plan: 'Precision Valve PV-450 Final Inspection', status: 'SUBMITTED', daysBack: 1,
      results: [
        { parameter: 'Pressure Test', specificationValue: 'Hold 15 bar / 5 min', actualValue: 'Held, no drop', result: 'PASS' },
        { parameter: 'Leakage Test', specificationValue: 'Zero leakage', actualValue: 'Zero leakage confirmed', result: 'PASS' },
        { parameter: 'Visual/Cosmetic Check', specificationValue: 'No visible defects', actualValue: 'Hairline mark on body (cosmetic)', result: 'MARGINAL', observations: 'Cosmetic only, functionality unaffected' },
        { parameter: 'Marking & Identification', specificationValue: 'Per Part No. PV-450-B', actualValue: 'Conforms', result: 'PASS' },
      ],
    },
    {
      plan: 'GearBox GX-200 Assembly Inspection', status: 'UNDER_REVIEW', daysBack: 1,
      results: [
        { parameter: 'Torque - Cover Bolts', specificationValue: '60 Nm', actualValue: '58 Nm', result: 'MARGINAL', observations: 'Slightly below spec, re-torque recommended' },
        { parameter: 'Backlash Measurement', specificationValue: '0.05-0.10 mm', actualValue: '0.12 mm', result: 'FAIL', observations: 'Gear backlash exceeds upper limit - gear set adjustment needed' },
        { parameter: 'Oil Seal Check', specificationValue: 'No leakage', actualValue: 'No leakage', result: 'PASS' },
        { parameter: 'Vibration Test', specificationValue: '< 2.0 mm/s RMS', actualValue: '1.8 mm/s RMS', result: 'PASS' },
      ],
      l1ReviewedBy: production,
    },
  ];


  for (const r of reportDefs) {
    const plan = planBy[r.plan];
    // Match on plan+status (each seeded plan only has one report per status) rather than the
    // computed inspectionDate — daysAgo() is relative to "now", so its millisecond value differs
    // on every run and would never match a previous run's, silently duplicating reports.
    const existing = await InspectionReport.findOne({ organization: org._id, plan: plan._id, status: r.status });
    if (existing) continue;
    await InspectionReport.create({
      plan: plan._id,
      inspectionDate: daysAgo(r.daysBack),
      inspector: inspector._id,
      status: r.status,
      checklistResults: r.results,
      observations: r.status === 'REJECTED' ? undefined : 'Inspection completed per checklist.',
      approvedBy: (r as any).approvedBy?._id,
      approvedAt: (r as any).approvedBy ? daysAgo(Math.max(r.daysBack - 1, 0)) : undefined,
      reviewedBy: (r as any).reviewedBy?._id,
      reviewedAt: (r as any).reviewedBy ? daysAgo(Math.max(r.daysBack - 1, 0)) : undefined,
      l1ReviewedBy: (r as any).l1ReviewedBy?._id,
      l1ReviewedAt: (r as any).l1ReviewedBy ? daysAgo(r.daysBack) : undefined,
      l1Comments: (r as any).l1ReviewedBy ? 'Reviewed — forwarded for final QM approval' : undefined,
      rejectionReason: (r as any).rejectionReason,
      organization: org._id,
    });
  }
  console.log(`✓ Inspection Reports: ${reportDefs.length}`);

  // ── Product Quality Plans ────────────────────────────────────────────────────
  const gearboxReports = await InspectionReport.find({ organization: org._id, plan: planBy['GearBox GX-200 Manufacturing Inspection']._id });
  const pqpDefs = [
    { product: gearbox, status: 'ACTIVE', overallStatus: 'AMBER' },
    { product: valve,   status: 'COMPLETED', overallStatus: 'GREEN' },
    { product: pump,    status: 'ACTIVE', overallStatus: 'GREY' },
  ];
  for (const p of pqpDefs) {
    await ProductQualityPlan.findOneAndUpdate(
      { product: p.product._id, organization: org._id },
      {
        product: p.product._id,
        manufacturingInspections: gearboxReports.length && p.product._id.equals(gearbox._id)
          ? [{ stage: mfgBy['Machining']._id, plan: planBy['GearBox GX-200 Manufacturing Inspection']._id, report: gearboxReports[0]._id, inspector: inspector._id, status: 'APPROVED' }]
          : [],
        assemblyInspections: [],
        finalProductInspection: { status: 'PENDING' },
        materialInspections: [],
        qualityManager: quality._id,
        reviewStatus: p.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        status: p.status,
        overallStatus: p.overallStatus,
        createdBy: quality._id,
        organization: org._id,
      },
      { upsert: true }
    );
  }
  console.log(`✓ Product Quality Plans: ${pqpDefs.length}`);

  // ── Supplier Evaluations ─────────────────────────────────────────────────────
  type EvalDef = { supplier: string; period: string; quality: number; delivery: number; quantity: number; comm: number; status: 'PENDING'|'APPROVED'|'REJECTED'; daysBack: number; remarks?: string };
  const evalDefs: EvalDef[] = [
    { supplier: 'SteelTech Metals Pvt Ltd',  period: 'Q1 2026', quality: 9, delivery: 8, quantity: 9, comm: 8, status: 'APPROVED', daysBack: 30 },
    { supplier: 'SteelTech Metals Pvt Ltd',  period: 'Q2 2026', quality: 9, delivery: 8.5, quantity: 9, comm: 8, status: 'PENDING', daysBack: 3 },
    { supplier: 'Precision Components Ltd', period: 'Q1 2026', quality: 8, delivery: 7, quantity: 8, comm: 7.5, status: 'APPROVED', daysBack: 28 },
    { supplier: 'FastFix Hardware',         period: 'Q1 2026', quality: 9.5, delivery: 9, quantity: 9, comm: 9, status: 'APPROVED', daysBack: 25 },
    { supplier: 'ChemPro Coatings',         period: 'Q1 2026', quality: 6, delivery: 5.5, quantity: 6.5, comm: 6, status: 'PENDING', daysBack: 5 },
    { supplier: 'RubberTech Seals',         period: 'Q1 2026', quality: 4, delivery: 4.5, quantity: 4, comm: 4, status: 'APPROVED', daysBack: 40, remarks: 'Repeated seal defects — recommend supplier suspension review.' },
    { supplier: 'Precision Components Ltd', period: 'Q2 2026', quality: 8.2, delivery: 7.4, quantity: 8, comm: 7.8, status: 'PENDING', daysBack: 2 },
  ];
  for (const e of evalDefs) {
    const sup = supBy[e.supplier];
    const evaluationDate = daysAgo(e.daysBack);
    const existing = await SupplierEvaluation.findOne({ supplier: sup._id, period: e.period, organization: org._id });
    if (existing) continue;
    await SupplierEvaluation.create({
      supplier: sup._id,
      evaluationDate,
      evaluatedBy: stores._id,
      period: e.period,
      qualityScore: e.quality, deliveryScore: e.delivery, quantityScore: e.quantity, communicationScore: e.comm,
      remarks: e.remarks,
      recommendedStatus: e.quality < 5 ? 'SUSPEND' : e.quality < 7 ? 'IMPROVE' : 'MAINTAIN',
      reviewStatus: e.status,
      reviewedBy: e.status === 'APPROVED' ? quality._id : undefined,
      approvedAt: e.status === 'APPROVED' ? daysAgo(Math.max(e.daysBack - 1, 0)) : undefined,
      organization: org._id,
    });
  }
  console.log(`✓ Supplier Evaluations: ${evalDefs.length}`);

  // ── Production Plans ─────────────────────────────────────────────────────────
  type ProductionPlanDef = { product: typeof gearbox; qty: number; status: 'DRAFT'|'SCHEDULED'|'IN_PROGRESS'|'COMPLETED'; startBack?: number; startFwd?: number; endFwd: number };
  const productionPlanDefs: ProductionPlanDef[] = [
    { product: gearbox, qty: 500, status: 'IN_PROGRESS', startBack: 10, endFwd: 20 },
    { product: valve,   qty: 1200, status: 'SCHEDULED', startFwd: 3, endFwd: 25 },
    { product: pump,    qty: 300, status: 'DRAFT', startFwd: 14, endFwd: 45 },
  ];
  for (const p of productionPlanDefs) {
    const existing = await ProductionPlan.findOne({ product: p.product._id, organization: org._id });
    if (existing) continue;
    const mfgAssignments = (p.product.manufacturingStages || []).map((stageId: any, i: number) => ({
      stage: stageId, stageType: 'MANUFACTURING' as const, order: i + 1, operator: production._id,
      status: (p.status === 'IN_PROGRESS' && i === 0 ? 'IN_PROGRESS' : 'NOT_STARTED') as 'IN_PROGRESS' | 'NOT_STARTED',
    }));
    const asmAssignments = (p.product.assemblyStages || []).map((stageId: any, i: number) => ({
      stage: stageId, stageType: 'ASSEMBLING' as const, order: i + 1, operator: production._id, status: 'NOT_STARTED' as const,
    }));
    await ProductionPlan.create({
      product: p.product._id,
      targetQuantity: p.qty,
      plannedStartDate: p.startBack ? daysAgo(p.startBack) : daysFromNow(p.startFwd!),
      plannedEndDate: daysFromNow(p.endFwd),
      manufacturingStages: mfgAssignments,
      assemblingStages: asmAssignments,
      status: p.status,
      createdBy: production._id,
      organization: org._id,
    });
  }
  console.log(`✓ Production Plans: ${productionPlanDefs.length}`);

  // ── Supplier ↔ Material links (set after materials exist) ────────────────────
  const reloadedMats = await Material.find({ organization: org._id });
  const matByName2 = Object.fromEntries(reloadedMats.map((m) => [m.name, m]));
  const supplierMaterialMap: Record<string, string[]> = {
    'SteelTech Metals Pvt Ltd':  ['Carbon Steel Grade 1045', 'Stainless Steel SS316', 'Bearing Steel AISI 52100'],
    'Precision Components Ltd':  ['Aluminium Alloy 6061'],
    'FastFix Hardware':          ['Carbon Steel Grade 1045'],
    'ChemPro Coatings':          [],
    'RubberTech Seals':          ['Rubber Compound RC-45'],
  };
  for (const [supName, matNames] of Object.entries(supplierMaterialMap)) {
    const matIds = matNames.map((n) => matByName2[n]?._id).filter(Boolean);
    await Supplier.findOneAndUpdate(
      { name: supName, organization: org._id },
      { $set: { materials: matIds } }
    );
  }
  console.log(`✓ Supplier-Material links updated`);

  // ── Manufacturing Documents ──────────────────────────────────────────────────
  // fileUrl is set to a sentinel value so the download route can detect the file
  // is seeded (not physically uploaded) and respond with a descriptive placeholder
  // instead of a 404. Real uploads will overwrite fileUrl with a real path.
  const SEED_DOC_URL = 'SEED_PLACEHOLDER';
  const docDefs = [
    { name: 'GearBox Assembly SOP',            category: 'Procedure',   fileType: 'PDF',  stage: undefined as string | undefined },
    { name: 'Heat Treatment Work Instruction', category: 'Guideline',   fileType: 'PDF',  stage: 'Heat Treatment' },
    { name: 'Incoming Material Checklist',     category: 'Checklist',   fileType: 'XLSX', stage: 'Raw Material Preparation' },
    { name: 'Machining Tolerance Standard',    category: 'Template',    fileType: 'DWG',  stage: 'Machining' },
    { name: 'Quality Policy Manual',           category: 'Policy',      fileType: 'PDF',  stage: undefined as string | undefined },
    { name: 'Supplier Quality Agreement',      category: 'Certificate', fileType: 'PDF',  stage: undefined as string | undefined },
  ];
  for (const d of docDefs) {
    const stageDoc = d.stage ? mfgBy[d.stage] : undefined;
    await MfgDocument.findOneAndUpdate(
      { name: d.name, organization: org._id },
      {
        name: d.name, category: d.category, fileType: d.fileType,
        fileName: `${d.name.replace(/\s+/g, '_')}.${(d.fileType as string).toLowerCase()}`,
        fileSize: '1.2 MB',
        version: '1.0',
        description: `${d.name} for QMICS manufacturing operations.`,
        manufacturingStage: stageDoc?._id,
        uploadedBy: quality._id,
        fileUrl: SEED_DOC_URL,
        organization: org._id,
      },
      { upsert: true }
    );
  }
  console.log(`✓ Manufacturing Documents: ${docDefs.length}`);

  // ── Calibration Records ──────────────────────────────────────────────────────
  type CalibDef = { equipment: string; result: 'PASS'|'FAIL'|'CONDITIONAL'; approvalStatus: 'PENDING'|'APPROVED'|'REJECTED'; daysBack: number };
  const calibDefs: CalibDef[] = [
    { equipment: 'Vernier Caliper VC-07',           result: 'PASS', approvalStatus: 'APPROVED', daysBack: 30 },
    { equipment: 'Rockwell Hardness Tester RHT-12', result: 'PASS', approvalStatus: 'APPROVED', daysBack: 45 },
    { equipment: 'CMM Machine CMM-03',              result: 'CONDITIONAL', approvalStatus: 'PENDING', daysBack: 2 },
    { equipment: 'Micrometer MIC-09',               result: 'FAIL', approvalStatus: 'PENDING', daysBack: 1 },
  ];
  for (const c of calibDefs) {
    const eq = equipBy[c.equipment];
    // Each seeded equipment only gets one calibration record here — match on equipment alone
    // rather than the computed calibrationDate, which (like inspectionDate above) isn't stable
    // across separate runs.
    const existing = await CalibrationRecord.findOne({ equipment: eq._id, organization: org._id });
    if (existing) continue;
    await CalibrationRecord.create({
      equipment: eq._id,
      calibrationDate: daysAgo(c.daysBack),
      nextDueDate: daysFromNow(90 - c.daysBack),
      performedBy: 'Certified Calibration Services Pvt Ltd',
      result: c.result,
      approvalStatus: c.approvalStatus,
      submittedBy: inspector._id,
      reviewedBy: c.approvalStatus === 'APPROVED' ? quality._id : undefined,
      reviewedAt: c.approvalStatus === 'APPROVED' ? daysAgo(Math.max(c.daysBack - 1, 0)) : undefined,
      organization: org._id,
    });
  }
  console.log(`✓ Calibration Records: ${calibDefs.length}`);

  // ── Audit Log history (so the Dashboard activity feed isn't empty on first login) ──
  type AuditDef = { action: 'Created'|'Updated'|'Deleted'; entityType: string; entityName: string; by: typeof admin; daysBack: number };
  const auditDefs: AuditDef[] = [
    { action: 'Created', entityType: 'Product',           entityName: 'Industrial Pump IP-750',          by: production, daysBack: 14 },
    { action: 'Created', entityType: 'Supplier',          entityName: 'ChemPro Coatings',                 by: stores,     daysBack: 12 },
    { action: 'Updated',  entityType: 'InspectionPlan',    entityName: 'GearBox GX-200 Manufacturing Inspection', by: quality, daysBack: 9 },
    { action: 'Created',  entityType: 'InspectionReport',  entityName: 'Steel Shaft Dimensional Inspection Report', by: inspector, daysBack: 8 },
    { action: 'Updated',  entityType: 'SupplierEvaluation', entityName: 'SteelTech Metals Pvt Ltd Q1 2026 Evaluation', by: quality, daysBack: 6 },
    { action: 'Created',  entityType: 'ProductionPlan',    entityName: 'GearBox GX-200 Production Run',   by: production, daysBack: 10 },
    { action: 'Updated',  entityType: 'Equipment',          entityName: 'Micrometer MIC-09',               by: quality,    daysBack: 1 },
    { action: 'Created',  entityType: 'Document',           entityName: 'Quality Policy Manual',           by: quality,    daysBack: 5 },
    { action: 'Updated',  entityType: 'InspectionReport',   entityName: 'Precision Valve PV-450 Manufacturing Inspection Report', by: production, daysBack: 3 },
    { action: 'Created',  entityType: 'User',               entityName: 'Inspector Ravi',                  by: admin,      daysBack: 20 },
  ];
  for (const a of auditDefs) {
    const existing = await AuditLogEntry.findOne({ organization: org._id, entityType: a.entityType, entityName: a.entityName, action: a.action });
    if (existing) continue;
    await AuditLogEntry.create({
      action: a.action, entityType: a.entityType, entityName: a.entityName,
      performedBy: a.by._id, organization: org._id, createdAt: daysAgo(a.daysBack),
    });
  }
  console.log(`✓ Audit Log Entries: ${auditDefs.length}`);

  // ── AI usage history (backdated so it doesn't eat into today's live Gemini quota) ──
  const aiFeatures: { feature: string; provider: string }[] = [
    { feature: 'findings', provider: 'gemini' }, { feature: 'capa', provider: 'gemini' },
    { feature: 'copilot', provider: 'groq' }, { feature: 'copilot', provider: 'groq' },
    { feature: 'gap-analysis', provider: 'gemini' }, { feature: 'risk-score', provider: 'formula' },
    { feature: 'risk-score', provider: 'gemini' }, { feature: 'quality-score', provider: 'formula' },
    { feature: 'scheduling', provider: 'formula' }, { feature: 'report', provider: 'gemini' },
    { feature: 'maturity', provider: 'gemini' }, { feature: 'prediction', provider: 'gemini' },
    { feature: 'benchmarking', provider: 'gemini' }, { feature: 'executive-summary', provider: 'gemini' },
    { feature: 'assessment-assist', provider: 'gemini' }, { feature: 'copilot', provider: 'groq' },
    { feature: 'findings', provider: 'gemini' }, { feature: 'quality-score', provider: 'formula' },
  ];
  // AIAuditLog has no organization field (it's a global collection also written by real AI
  // calls), so existence can't be scoped by org — tag seeded rows with a marker in
  // inputSummary instead, since matching by count alone would double up every rerun (and would
  // also misfire against the real usage history this collection accumulates over the session).
  const SEED_MARKER = 'seed-demo-history';
  const existingAiLogs = await AIAuditLog.countDocuments({ inputSummary: SEED_MARKER });
  if (existingAiLogs === 0) {
    for (let i = 0; i < aiFeatures.length; i++) {
      const f = aiFeatures[i];
      await AIAuditLog.create({
        feature: f.feature,
        provider: f.provider,
        inputSummary: SEED_MARKER,
        success: i !== 3, // one deliberate failure so the "Recent Errors" surface has content
        durationMs: f.provider === 'groq' ? 400 + Math.floor(Math.random() * 300) : 1200 + Math.floor(Math.random() * 2500),
        errorMessage: i === 3 ? 'Gemini 503: model overloaded, retried once' : undefined,
        createdAt: daysAgo(2 + (i % 6)),
      });
    }
    console.log(`✓ AI Audit Log (backdated demo history): ${aiFeatures.length}`);
  } else {
    console.log(`  ~ AI Audit Log already has ${existingAiLogs} entries, skipping demo history`);
  }

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:      admin@qmics.com      / Admin@2025');
  console.log('  Quality Mgr:quality@qmics.com    / Qual@2025');
  console.log('  Inspector:  inspector@qmics.com  / Insp@2025\n');

  await mongoose.disconnect();
  console.log('[DB] Disconnected');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
