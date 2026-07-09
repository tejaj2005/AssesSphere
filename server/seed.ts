import 'dotenv/config';
import { connectDB } from './db';
import mongoose from 'mongoose';
import { Organization }      from './models/Organization';
import { User }              from './models/User';
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
import type { UserRole } from './models/User';
import type { IPermission } from './models/Role';

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
    { name: 'Vernier Caliper VC-07',          type: 'Measurement',           calibrationStatus: 'COMPLETED', calibrationFrequencyDays: 90,  nextCalibrationDate: new Date(Date.now() + 60*86400000) },
    { name: 'Rockwell Hardness Tester RHT-12',type: 'Hardness Testing',       calibrationStatus: 'COMPLETED', calibrationFrequencyDays: 180, nextCalibrationDate: new Date(Date.now() + 120*86400000) },
    { name: 'CMM Machine CMM-03',             type: 'Coordinate Measurement', calibrationStatus: 'PENDING',   calibrationFrequencyDays: 365, nextCalibrationDate: new Date(Date.now() + 5*86400000) },
    { name: 'Torque Wrench TW-05',            type: 'Torque Measurement',     calibrationStatus: 'COMPLETED', calibrationFrequencyDays: 180, nextCalibrationDate: new Date(Date.now() + 90*86400000) },
    { name: 'Micrometer MIC-09',              type: 'Measurement',            calibrationStatus: 'OVERDUE',   calibrationFrequencyDays: 90,  nextCalibrationDate: new Date(Date.now() - 5*86400000) },
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
  console.log(`✓ Suppliers: ${suppliers.length}`);

  const matTypes = ['Steel','Aluminium','Rubber','Chemical','Electrical','Composite'];
  for (const name of matTypes) {
    await MaterialType.findOneAndUpdate({ name, organization: org._id }, { name, organization: org._id }, { upsert: true });
  }

  const materials = [
    { name: 'Carbon Steel Grade 1045', unit: 'kg' }, { name: 'Stainless Steel SS316', unit: 'kg' },
    { name: 'Aluminium Alloy 6061',    unit: 'kg' }, { name: 'Rubber Compound RC-45', unit: 'liters' },
    { name: 'Bearing Steel AISI 52100',unit: 'kg' },
  ];
  for (const m of materials) {
    await Material.findOneAndUpdate({ name: m.name, organization: org._id }, { ...m, inspectionRequired: true, organization: org._id }, { upsert: true });
  }
  console.log(`✓ Materials: ${materials.length}`);

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

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:      admin@qmics.com      / Admin@2025');
  console.log('  Quality Mgr:quality@qmics.com    / Qual@2025');
  console.log('  Inspector:  inspector@qmics.com  / Insp@2025\n');

  await mongoose.disconnect();
  console.log('[DB] Disconnected');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
