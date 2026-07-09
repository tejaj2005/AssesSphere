import { Router } from 'express';
import { ProductQualityPlan } from '../models/ProductQualityPlan';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.organization)   filter.organization   = req.query.organization;
    if (req.query.status)         filter.status         = req.query.status;
    if (req.query.product)        filter.product        = req.query.product;
    if (req.query.qualityManager) filter.qualityManager = req.query.qualityManager;
    const data = await ProductQualityPlan.find(filter)
      .populate('product','name productId').populate('qualityManager','name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const plan = await ProductQualityPlan.findById(req.params.id)
      .populate('product').populate('qualityManager','name email')
      .populate('manufacturingInspections.plan').populate('assemblyInspections.plan');
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ success: true, data: await ProductQualityPlan.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const plan = await ProductQualityPlan.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id/complete', async (req, res) => {
  try {
    const plan = await ProductQualityPlan.findByIdAndUpdate(
      req.params.id,
      { status: 'COMPLETED', reviewStatus: 'COMPLETED', completedAt: new Date(), overallStatus: 'GREEN' },
      { returnDocument: 'after' }
    );
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
