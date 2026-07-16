import { Router, Response } from 'express';
import { ProductQualityPlan } from '../models/ProductQualityPlan';
import { AuthedRequest, requireRole } from '../middleware/auth';

const router = Router();

// The Quality manager owns the product quality plan: they create it, sign off its per-material
// inspection rows, and mark it complete. The Production manager reviews it and can amend the
// plan body, so the generic edit route allows both. Reads stay open to any authenticated org
// member (both managers' dashboards list these, org-scoped).
const qmOnly = requireRole('QualityManager');
const planEditors = requireRole('QualityManager', 'ProductionManager');

router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { organization: req.auth!.organization };
    if (req.query.status)         filter.status         = req.query.status;
    if (req.query.product)        filter.product        = req.query.product;
    if (req.query.qualityManager) filter.qualityManager = req.query.qualityManager;
    const data = await ProductQualityPlan.find(filter)
      .populate('product','name productId').populate('qualityManager','name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const plan = await ProductQualityPlan.findOne({ _id: req.params.id, organization: req.auth!.organization })
      .populate('product').populate('qualityManager','name email')
      .populate('manufacturingInspections.plan').populate('assemblyInspections.plan');
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', qmOnly, async (req: AuthedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await ProductQualityPlan.create({ ...req.body, organization: req.auth!.organization }) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', planEditors, async (req: AuthedRequest, res: Response) => {
  try {
    const { organization, ...rest } = req.body;
    const plan = await ProductQualityPlan.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, rest, { returnDocument: 'after' });
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
router.put('/:id/material-inspections/:idx', qmOnly, async (req: AuthedRequest, res: Response) => {
  try {
    const idx = parseInt(req.params.idx as string, 10);
    if (isNaN(idx) || idx < 0) return res.status(400).json({ success: false, error: 'Invalid index' });
    const update: Record<string, any> = { [`materialInspections.${idx}.status`]: req.body.status };
    if (req.body.notes !== undefined) update[`materialInspections.${idx}.notes`] = req.body.notes;
    const plan = await ProductQualityPlan.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, { $set: update }, { returnDocument: 'after' })
      .populate('product', 'name productId').populate('qualityManager', 'name email');
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id/complete', qmOnly, async (req: AuthedRequest, res: Response) => {
  try {
    const plan = await ProductQualityPlan.findOneAndUpdate(
      { _id: req.params.id, organization: req.auth!.organization },
      { status: 'COMPLETED', reviewStatus: 'COMPLETED', completedAt: new Date(), overallStatus: 'GREEN' },
      { returnDocument: 'after' }
    );
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
