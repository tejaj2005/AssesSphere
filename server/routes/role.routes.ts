import { Router, Response } from 'express';
import { Role } from '../models/Role';
import { AuthedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    res.json({ success: true, data: await Role.find({ organization: req.auth!.organization }).sort({ name: 1 }) });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req: AuthedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await Role.create({ ...req.body, organization: req.auth!.organization }) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, organization: req.auth!.organization });
    if (!role) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: role });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const { organization, ...rest } = req.body;
    const role = await Role.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, rest, { returnDocument: 'after' });
    if (!role) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: role });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, organization: req.auth!.organization });
    if (!role) return res.status(404).json({ success: false, error: 'Not found' });
    if (role.isSystem) return res.status(400).json({ success: false, error: 'Cannot delete a system role' });
    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
