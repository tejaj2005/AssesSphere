import { Router, Request, Response } from 'express';
import {
  User, Organization, Department, Product, Component,
  ManufacturingStage, AssemblyStage, Equipment, Material,
  MaterialType, Supplier, InspectionType, InspectionMethod, CalibrationRecord,
  SupplierEvalMethod
} from '../models/index';

const router = Router();

const pg = (req: Request) => ({ page: parseInt(req.query.page as string)||1, limit: parseInt(req.query.limit as string)||20 });

// USERS
router.get('/users', async (req, res) => {
  try {
    const { page, limit } = pg(req);
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    const [data, total] = await Promise.all([
      User.find(filter).select('-password').sort({ name: 1 }).skip((page-1)*limit).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.post('/users', async (req, res) => {
  try { res.status(201).json({ success: true, data: await User.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.get('/users/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('-password').populate('organization');
    if (!u) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: u });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/users/:id', async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const u = await User.findByIdAndUpdate(req.params.id, rest, { returnDocument: 'after' }).select('-password');
    if (!u) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: u });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.delete('/users/:id', async (req, res) => {
  try { await User.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ success: true }); }
  catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// PRODUCTS
router.get('/products', async (req, res) => {
  try {
    const { page, limit } = pg(req);
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.$text = { $search: req.query.search as string };
    const [data, total] = await Promise.all([
      Product.find(filter).populate('components').populate('manufacturingStages').populate('assemblyStages').sort({ name: 1 }).skip((page-1)*limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.post('/products', async (req, res) => {
  try { res.status(201).json({ success: true, data: await Product.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.get('/products/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).populate('components').populate('manufacturingStages').populate('assemblyStages');
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: p });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/products/:id', async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: p });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// EQUIPMENT + CALIBRATION
router.get('/equipment', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.calibrationStatus) filter.calibrationStatus = req.query.calibrationStatus;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    res.json({ success: true, data: await Equipment.find(filter).sort({ name: 1 }) });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.post('/equipment', async (req, res) => {
  try { res.status(201).json({ success: true, data: await Equipment.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.put('/equipment/:id', async (req, res) => {
  try {
    const eq = await Equipment.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!eq) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: eq });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.post('/equipment/:id/calibration', async (req, res) => {
  try {
    const record = await CalibrationRecord.create({ equipment: req.params.id, ...req.body });
    res.status(201).json({ success: true, data: record });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// CALIBRATION RECORDS — submitted by inspectors, approved/rejected by QM.
// Approval only patches Equipment.calibrationStatus once APPROVED, so a pending/rejected
// submission never silently marks equipment as calibrated.
router.get('/calibration-records', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    if (req.query.equipment) filter.equipment = req.query.equipment;
    const data = await CalibrationRecord.find(filter)
      .populate('equipment', 'name equipmentId type')
      .populate('submittedBy', 'name').populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/calibration-records/:id/approve', async (req, res) => {
  try {
    const record = await CalibrationRecord.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'APPROVED', reviewedBy: req.body.reviewedBy, reviewedAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });
    await Equipment.findByIdAndUpdate(record.equipment, {
      calibrationStatus: record.result === 'PASS' ? 'COMPLETED' : 'PENDING',
      lastCalibrationDate: record.calibrationDate,
      nextCalibrationDate: record.nextDueDate,
    });
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/calibration-records/:id/reject', async (req, res) => {
  try {
    const record = await CalibrationRecord.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'REJECTED', reviewedBy: req.body.reviewedBy, reviewedAt: new Date(), rejectionReason: req.body.rejectionReason },
      { returnDocument: 'after' }
    );
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// SUPPLIERS
router.get('/suppliers', async (req, res) => {
  try {
    const { page, limit } = pg(req);
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    const [data, total] = await Promise.all([
      Supplier.find(filter).sort({ name: 1 }).skip((page-1)*limit).limit(limit),
      Supplier.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.post('/suppliers', async (req, res) => {
  try { res.status(201).json({ success: true, data: await Supplier.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.put('/suppliers/:id', async (req, res) => {
  try {
    const s = await Supplier.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!s) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: s });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// COMPONENTS / MATERIALS / STAGES / TYPES — compact pattern
const simpleRoutes: { path: string; Model: any; populate: string[]; sort?: Record<string, 1 | -1> }[] = [
  { path: '/components',           Model: Component,          populate: ['material','primarySupplier'] },
  { path: '/materials',            Model: Material,           populate: ['materialType'] },
  { path: '/material-types',       Model: MaterialType,       populate: [] },
  { path: '/manufacturing-stages', Model: ManufacturingStage, populate: [], sort: { sequence: 1 } },
  { path: '/assembly-stages',      Model: AssemblyStage,      populate: [], sort: { sequence: 1 } },
  { path: '/inspection-types',     Model: InspectionType,     populate: [] },
  { path: '/inspection-methods',   Model: InspectionMethod,   populate: [] },
  { path: '/departments',          Model: Department,         populate: ['head'] },
  { path: '/organizations',        Model: Organization,       populate: [] },
  { path: '/supplier-eval-methods',Model: SupplierEvalMethod, populate: [] },
];

simpleRoutes.forEach(({ path: rPath, Model, populate, sort }) => {
  router.get(rPath, async (req, res) => {
    try {
      const filter: any = {};
      if (req.query.organization) filter.organization = req.query.organization;
      let q = Model.find(filter);
      populate.forEach((f: string) => { q = q.populate(f); });
      if (sort) q = q.sort(sort);
      res.json({ success: true, data: await q });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });
  router.post(rPath, async (req, res) => {
    try { res.status(201).json({ success: true, data: await Model.create(req.body) }); }
    catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
  });
  router.put(`${rPath}/:id`, async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
      if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, data: doc });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
  });
  router.delete(`${rPath}/:id`, async (req, res) => {
    try { await Model.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });
});

export default router;
