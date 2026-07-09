import { Router } from 'express';
import { ProductionPlan } from '../models/ProductionPlan';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.product) filter.product = req.query.product;
    const data = await ProductionPlan.find(filter)
      .populate('product', 'name productId')
      .populate('manufacturingStages.operator', 'name')
      .populate('assemblingStages.operator', 'name')
      .populate('createdBy', 'name')
      .sort({ plannedStartDate: -1 });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const plan = await ProductionPlan.findById(req.params.id)
      .populate('product')
      .populate('manufacturingStages.stage').populate('manufacturingStages.operator', 'name')
      .populate('assemblingStages.stage').populate('assemblingStages.operator', 'name')
      .populate('createdBy', 'name');
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ success: true, data: await ProductionPlan.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const plan = await ProductionPlan.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await ProductionPlan.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
