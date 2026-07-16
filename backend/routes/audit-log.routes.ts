import { Router, Response } from 'express';
import { AuditLogEntry } from '../models/AuditLogEntry';
import { AuthedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { organization: req.auth!.organization };
    if (req.query.entityType) filter.entityType = req.query.entityType;
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await AuditLogEntry.find(filter)
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
