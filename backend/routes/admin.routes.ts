import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  User, Organization, Department, Product, Component,
  ManufacturingStage, AssemblyStage, Equipment, Material,
  MaterialType, Supplier, InspectionType, InspectionMethod, CalibrationRecord,
  SupplierEvalMethod
} from '../models/index';
import { AuthedRequest, requireRole } from '../middleware/auth';

// Resolved against the backend package root (npm runs scripts with cwd = this folder), so
// certificates land in backend/uploads/calibration-certificates.
const CERT_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'calibration-certificates');
if (!fs.existsSync(CERT_UPLOAD_DIR)) fs.mkdirSync(CERT_UPLOAD_DIR, { recursive: true });
const certStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CERT_UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const uploadCert = multer({ storage: certStorage, limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_MB || '10')) * 1024 * 1024 } });

const router = Router();

const pg = (req: Request) => ({ page: parseInt(req.query.page as string)||1, limit: parseInt(req.query.limit as string)||20 });

// Every route below is mounted behind requireAuth (see routes/index.ts), so req.auth is always
// populated. The organization claim in the verified JWT — never a client-suppliable query
// param or body field — is what scopes every read/write to the caller's own tenant. Before this,
// list routes only filtered by organization if the client bothered to pass it as a query string,
// and every single-record GET/PUT/DELETE did a bare findById with no ownership check at all —
// any authenticated user, regardless of org or role, could read/edit/delete any other
// organization's products, equipment, suppliers, users, etc. just by knowing or guessing the id.
const orgOf = (req: AuthedRequest) => req.auth!.organization;

// Master-data (products, equipment, suppliers, materials, stages, types, methods, departments,
// user administration, org config) is created/edited/deleted only by Admins. The GET routes are
// left open to any authenticated org member on purpose — every module's forms pull this data as
// reference/dropdown options (an inspector picking equipment, a QM listing inspectors), and
// org-scoping already confines those reads to the caller's own tenant. Only the mutations, and
// the two workflow actions that belong to specific non-admin roles (inspectors submitting a
// calibration, QMs approving/rejecting one), carry role checks.
const adminOnly = requireRole('Admin');

// USERS
router.get('/users', async (req: AuthedRequest, res: Response) => {
  try {
    const { page, limit } = pg(req);
    const filter: any = { organization: orgOf(req) };
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    const [data, total] = await Promise.all([
      User.find(filter).select('-password').sort({ name: 1 }).skip((page-1)*limit).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.post('/users', adminOnly, async (req: AuthedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await User.create({ ...req.body, organization: orgOf(req) }) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.get('/users/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const u = await User.findOne({ _id: req.params.id, organization: orgOf(req) }).select('-password').populate('organization');
    if (!u) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: u });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
// This route serves two very different callers: the Admin Users page (full edit of anyone in
// the org) and the shared Profile page, where every role edits their own name/email. Without
// the branch below, that second use case meant ANY authenticated user could PUT any org
// user's record — including setting their own `role` to 'Admin' or reactivating a disabled
// account. Non-admins are now limited to their own record and to non-privileged fields.
router.put('/users/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const { password, organization, ...rest } = req.body;
    let update: Record<string, any> = rest;
    if (req.auth!.role !== 'Admin') {
      if (req.auth!.userId !== req.params.id) {
        return res.status(403).json({ success: false, error: 'You can only edit your own profile' });
      }
      const { name, email, department, employeeId } = rest;
      update = { name, email, department, employeeId };
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);
    }
    const u = await User.findOneAndUpdate({ _id: req.params.id, organization: orgOf(req) }, update, { returnDocument: 'after' }).select('-password');
    if (!u) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: u });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.delete('/users/:id', adminOnly, async (req: AuthedRequest, res: Response) => {
  try {
    const u = await User.findOneAndUpdate({ _id: req.params.id, organization: orgOf(req) }, { isActive: false });
    if (!u) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
// The generic PUT above deliberately strips `password` (findByIdAndUpdate bypasses the
// pre('save') hashing hook, so letting it through there would store a plaintext password).
// This is the only real path to change one — verifies the current password, only allows a
// user to change their own, and goes through .save() so the hook hashes it correctly.
router.put('/users/:id/change-password', async (req: AuthedRequest, res: Response) => {
  try {
    if (req.auth?.userId !== req.params.id) return res.status(403).json({ success: false, error: 'Can only change your own password' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Current and new password required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    if (!(await user.comparePassword(currentPassword))) return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// PRODUCTS
router.get('/products', async (req: AuthedRequest, res: Response) => {
  try {
    const { page, limit } = pg(req);
    const filter: any = { organization: orgOf(req) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.$text = { $search: req.query.search as string };
    const [data, total] = await Promise.all([
      Product.find(filter).populate('components').populate('manufacturingStages').populate('assemblyStages').sort({ name: 1 }).skip((page-1)*limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.post('/products', adminOnly, async (req: AuthedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await Product.create({ ...req.body, organization: orgOf(req) }) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.get('/products/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const p = await Product.findOne({ _id: req.params.id, organization: orgOf(req) }).populate('components').populate('manufacturingStages').populate('assemblyStages');
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: p });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/products/:id', adminOnly, async (req: AuthedRequest, res: Response) => {
  try {
    const { organization, ...rest } = req.body;
    const p = await Product.findOneAndUpdate({ _id: req.params.id, organization: orgOf(req) }, rest, { returnDocument: 'after' })
      .populate('components').populate('manufacturingStages').populate('assemblyStages');
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: p });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.delete('/products/:id', adminOnly, async (req: AuthedRequest, res: Response) => {
  try {
    const p = await Product.findOneAndDelete({ _id: req.params.id, organization: orgOf(req) });
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// EQUIPMENT + CALIBRATION
router.get('/equipment', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { organization: orgOf(req) };
    if (req.query.calibrationStatus) filter.calibrationStatus = req.query.calibrationStatus;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    res.json({ success: true, data: await Equipment.find(filter).sort({ name: 1 }) });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.post('/equipment', adminOnly, async (req: AuthedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await Equipment.create({ ...req.body, organization: orgOf(req) }) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.get('/equipment/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const eq = await Equipment.findOne({ _id: req.params.id, organization: orgOf(req) });
    if (!eq) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: eq });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/equipment/:id', adminOnly, async (req: AuthedRequest, res: Response) => {
  try {
    const { organization, ...rest } = req.body;
    const eq = await Equipment.findOneAndUpdate({ _id: req.params.id, organization: orgOf(req) }, rest, { returnDocument: 'after' });
    if (!eq) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: eq });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.delete('/equipment/:id', adminOnly, async (req: AuthedRequest, res: Response) => {
  try {
    const eq = await Equipment.findOneAndDelete({ _id: req.params.id, organization: orgOf(req) });
    if (!eq) return res.status(404).json({ success: false, error: 'Not found' });
    await CalibrationRecord.deleteMany({ equipment: req.params.id });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
// Submitting a calibration record (with its certificate) is the inspector's job; QMs approve
// or reject them further down. Equipment CRUD above stays Admin-only.
router.post('/equipment/:id/calibration', requireRole('Inspector'), uploadCert.single('certificateFile'), async (req: AuthedRequest, res: Response) => {
  try {
    const eq = await Equipment.findOne({ _id: req.params.id, organization: orgOf(req) });
    if (!eq) return res.status(404).json({ success: false, error: 'Equipment not found' });
    const body: Record<string, any> = { ...req.body, equipment: req.params.id, organization: orgOf(req), submittedBy: req.auth!.userId };
    if (req.file) body.certificateFileUrl = `/uploads/calibration-certificates/${req.file.filename}`;
    const record = await CalibrationRecord.create(body);
    res.status(201).json({ success: true, data: record });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// Streams the certificate file after verifying the caller's organization owns this record —
// mirrors the same fix in document.routes.ts (these used to be served by a plain, unauthenticated
// express.static mount).
router.get('/calibration-records/:id/certificate', async (req: AuthedRequest, res: Response) => {
  try {
    const record = await CalibrationRecord.findOne({ _id: req.params.id, organization: orgOf(req) });
    if (!record || !record.certificateFileUrl) return res.status(404).json({ success: false, error: 'No certificate file attached' });
    const filename = path.basename(record.certificateFileUrl);
    const filePath = path.join(CERT_UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found' });
    res.download(filePath, filename);
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// CALIBRATION RECORDS — submitted by inspectors, approved/rejected by QM.
// Approval only patches Equipment.calibrationStatus once APPROVED, so a pending/rejected
// submission never silently marks equipment as calibrated.
router.get('/calibration-records', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { organization: orgOf(req) };
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    if (req.query.equipment) filter.equipment = req.query.equipment;
    const data = await CalibrationRecord.find(filter)
      .populate('equipment', 'name equipmentId type')
      .populate('submittedBy', 'name').populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/calibration-records/:id/approve', requireRole('QualityManager'), async (req: AuthedRequest, res: Response) => {
  try {
    // reviewedBy comes from the authenticated session, not the request body — otherwise any
    // caller could forge who approved a calibration in what's meant to be an audit trail.
    const record = await CalibrationRecord.findOneAndUpdate(
      { _id: req.params.id, organization: orgOf(req) },
      { approvalStatus: 'APPROVED', reviewedBy: req.auth!.userId, reviewedAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });
    await Equipment.findOneAndUpdate({ _id: record.equipment, organization: orgOf(req) }, {
      calibrationStatus: record.result === 'PASS' ? 'COMPLETED' : 'PENDING',
      lastCalibrationDate: record.calibrationDate,
      nextCalibrationDate: record.nextDueDate,
    });
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/calibration-records/:id/reject', requireRole('QualityManager'), async (req: AuthedRequest, res: Response) => {
  try {
    const record = await CalibrationRecord.findOneAndUpdate(
      { _id: req.params.id, organization: orgOf(req) },
      { approvalStatus: 'REJECTED', reviewedBy: req.auth!.userId, reviewedAt: new Date(), rejectionReason: req.body.rejectionReason },
      { returnDocument: 'after' }
    );
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// SUPPLIERS
router.get('/suppliers', async (req: AuthedRequest, res: Response) => {
  try {
    const { page, limit } = pg(req);
    const filter: any = { organization: orgOf(req) };
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    const [data, total] = await Promise.all([
      Supplier.find(filter).sort({ name: 1 }).skip((page-1)*limit).limit(limit),
      Supplier.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.post('/suppliers', adminOnly, async (req: AuthedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await Supplier.create({ ...req.body, organization: orgOf(req) }) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.get('/suppliers/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const s = await Supplier.findOne({ _id: req.params.id, organization: orgOf(req) });
    if (!s) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: s });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/suppliers/:id', adminOnly, async (req: AuthedRequest, res: Response) => {
  try {
    const { organization, ...rest } = req.body;
    const s = await Supplier.findOneAndUpdate({ _id: req.params.id, organization: orgOf(req) }, rest, { returnDocument: 'after' });
    if (!s) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: s });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.delete('/suppliers/:id', adminOnly, async (req: AuthedRequest, res: Response) => {
  try {
    const s = await Supplier.findOneAndDelete({ _id: req.params.id, organization: orgOf(req) });
    if (!s) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ORGANIZATION — unlike every other entity, an Organization document *is* the tenant boundary,
// so it can't be scoped by its own "organization" field. A caller may only ever see/edit their
// own organization; creating or deleting a tenant isn't a self-service operation this app
// exposes (new orgs are seeded directly, never via this API), so those are blocked outright.
router.get('/organizations', async (req: AuthedRequest, res: Response) => {
  try { res.json({ success: true, data: await Organization.find({ _id: orgOf(req) }) }); }
  catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.get('/organizations/:id', async (req: AuthedRequest, res: Response) => {
  try {
    if (req.params.id !== String(orgOf(req))) return res.status(403).json({ success: false, error: 'Cannot view another organization' });
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: org });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
router.put('/organizations/:id', adminOnly, async (req: AuthedRequest, res: Response) => {
  try {
    if (req.params.id !== String(orgOf(req))) return res.status(403).json({ success: false, error: 'Cannot edit another organization' });
    const org = await Organization.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!org) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: org });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});
router.post('/organizations', async (_req: AuthedRequest, res: Response) => {
  res.status(403).json({ success: false, error: 'Creating organizations is not available through this API' });
});
router.delete('/organizations/:id', async (_req: AuthedRequest, res: Response) => {
  res.status(403).json({ success: false, error: 'Deleting organizations is not available through this API' });
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
  { path: '/supplier-eval-methods',Model: SupplierEvalMethod, populate: [] },
];

simpleRoutes.forEach(({ path: rPath, Model, populate, sort }) => {
  router.get(rPath, async (req: AuthedRequest, res: Response) => {
    try {
      const filter: any = { organization: orgOf(req) };
      let q = Model.find(filter);
      populate.forEach((f: string) => { q = q.populate(f); });
      if (sort) q = q.sort(sort);
      res.json({ success: true, data: await q });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });
  router.post(rPath, adminOnly, async (req: AuthedRequest, res: Response) => {
    try { res.status(201).json({ success: true, data: await Model.create({ ...req.body, organization: orgOf(req) }) }); }
    catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
  });
  router.put(`${rPath}/:id`, adminOnly, async (req: AuthedRequest, res: Response) => {
    try {
      const { organization, ...rest } = req.body;
      let q = Model.findOneAndUpdate({ _id: req.params.id, organization: orgOf(req) }, rest, { returnDocument: 'after' });
      populate.forEach((f: string) => { q = q.populate(f); });
      const doc = await q;
      if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, data: doc });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
  });
  router.delete(`${rPath}/:id`, adminOnly, async (req: AuthedRequest, res: Response) => {
    try {
      const doc = await Model.findOneAndDelete({ _id: req.params.id, organization: orgOf(req) });
      if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });
});

export default router;
