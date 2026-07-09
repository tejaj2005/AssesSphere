import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { MfgDocument } from '../models/MfgDocument';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'server', 'uploads', 'documents');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_MB || '10')) * 1024 * 1024 },
});

router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.manufacturingStage) filter.manufacturingStage = req.query.manufacturingStage;
    const data = await MfgDocument.find(filter)
      .populate('manufacturingStage', 'name').populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const body: Record<string, any> = { ...req.body };
    if (req.file) {
      body.fileName = req.file.originalname;
      body.fileSize = `${(req.file.size / 1024).toFixed(1)} KB`;
      body.fileUrl = `/uploads/documents/${req.file.filename}`;
    }
    res.status(201).json({ success: true, data: await MfgDocument.create(body) });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const body: Record<string, any> = { ...req.body };
    if (req.file) {
      body.fileName = req.file.originalname;
      body.fileSize = `${(req.file.size / 1024).toFixed(1)} KB`;
      body.fileUrl = `/uploads/documents/${req.file.filename}`;
    }
    const doc = await MfgDocument.findByIdAndUpdate(req.params.id, body, { returnDocument: 'after' });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await MfgDocument.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
