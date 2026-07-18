import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { MfgDocument } from '../models/MfgDocument';
import { AuthedRequest } from '../middleware/auth';

const router = Router();

// Resolved against the backend package root (npm runs scripts with cwd = this folder), so
// uploads land in backend/uploads/documents.
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_MB || '10')) * 1024 * 1024 },
});

router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { organization: req.auth!.organization };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.manufacturingStage) filter.manufacturingStage = req.query.manufacturingStage;
    const data = await MfgDocument.find(filter)
      .populate('manufacturingStage', 'name').populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', upload.single('file'), async (req: AuthedRequest, res: Response) => {
  try {
    const body: Record<string, any> = { ...req.body, organization: req.auth!.organization };
    if (req.file) {
      body.fileName = req.file.originalname;
      body.fileSize = `${(req.file.size / 1024).toFixed(1)} KB`;
      body.fileUrl = `/uploads/documents/${req.file.filename}`;
    }
    res.status(201).json({ success: true, data: await MfgDocument.create(body) });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', upload.single('file'), async (req: AuthedRequest, res: Response) => {
  try {
    const { organization, ...rest } = req.body;
    const body: Record<string, any> = { ...rest };
    if (req.file) {
      body.fileName = req.file.originalname;
      body.fileSize = `${(req.file.size / 1024).toFixed(1)} KB`;
      body.fileUrl = `/uploads/documents/${req.file.filename}`;
    }
    const doc = await MfgDocument.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, body, { returnDocument: 'after' });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// Streams the actual file after verifying the caller's organization owns this document —
// the file itself lives under backend/uploads/documents, which used to be served directly via
// a static express.static mount with no auth at all, making every uploaded document (policies,
// certificates, design docs) downloadable by anyone with the URL, logged in or not.
router.get('/:id/file', async (req: AuthedRequest, res: Response) => {
  try {
    const doc = await MfgDocument.findOne({ _id: req.params.id, organization: req.auth!.organization });
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

    // Seeded demo documents have no physical file — they exist as reference data only.
    // Return a clear 404 with guidance rather than a confusing blank error.
    if (!doc.fileUrl || doc.fileUrl === 'SEED_PLACEHOLDER') {
      return res.status(404).json({
        success: false,
        error: `"${doc.name}" is a demo/seed document with no physical file attached. To make it downloadable, open it in the Documents page and upload a real file.`,
      });
    }

    const filename = path.basename(doc.fileUrl);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found on server' });
    res.download(filePath, doc.fileName || filename);
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});


router.delete('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const doc = await MfgDocument.findOneAndDelete({ _id: req.params.id, organization: req.auth!.organization });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    if (doc.fileUrl) {
      const filePath = path.join(UPLOAD_DIR, path.basename(doc.fileUrl));
      fs.unlink(filePath, () => {}); // best-effort; a missing file here shouldn't fail the delete
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
