import { Router } from 'express';
import { AuditLogEntry } from '../models/AuditLogEntry';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.entityType) filter.entityType = req.query.entityType;
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await AuditLogEntry.find(filter)
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ success: true, data: await AuditLogEntry.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

export default router;
