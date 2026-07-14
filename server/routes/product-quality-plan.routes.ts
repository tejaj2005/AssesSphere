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

// Targeted atomic update of a single materialInspections entry by array index. Deliberately
// NOT "read the array, change one entry client-side, PUT the whole array back" (the generic
// PUT /:id above does a full-document field replace) — two reviewers (or one reviewer clicking
// two rows in quick succession) acting on different entries of the same plan would otherwise
// race: whichever request's stale array snapshot lands last silently reverts the other's
// already-saved decision. A MongoDB $set on the specific indexed path only ever touches that
// one entry, so concurrent updates to different indices can't clobber each other.
router.put('/:id/material-inspections/:idx', async (req, res) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    if (isNaN(idx) || idx < 0) return res.status(400).json({ success: false, error: 'Invalid index' });
    const update: Record<string, any> = { [`materialInspections.${idx}.status`]: req.body.status };
    if (req.body.notes !== undefined) update[`materialInspections.${idx}.notes`] = req.body.notes;
    const plan = await ProductQualityPlan.findByIdAndUpdate(req.params.id, { $set: update }, { returnDocument: 'after' })
      .populate('product', 'name productId').populate('qualityManager', 'name email');
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
