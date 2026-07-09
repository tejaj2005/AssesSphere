import { Router } from 'express';
import { Role } from '../models/Role';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    res.json({ success: true, data: await Role.find(filter).sort({ name: 1 }) });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ success: true, data: await Role.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!role) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: role });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (role?.isSystem) return res.status(400).json({ success: false, error: 'Cannot delete a system role' });
    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
