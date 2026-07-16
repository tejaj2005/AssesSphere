import { Router, Response } from 'express';
import { ProductionPlan } from '../models/ProductionPlan';
import { AuthedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { organization: req.auth!.organization };
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

router.get('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const plan = await ProductionPlan.findOne({ _id: req.params.id, organization: req.auth!.organization })
      .populate('product')
      .populate('manufacturingStages.stage').populate('manufacturingStages.operator', 'name')
      .populate('assemblingStages.stage').populate('assemblingStages.operator', 'name')
      .populate('createdBy', 'name');
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req: AuthedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await ProductionPlan.create({ ...req.body, organization: req.auth!.organization }) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const { organization, ...rest } = req.body;
    const plan = await ProductionPlan.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, rest, { returnDocument: 'after' });
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const plan = await ProductionPlan.findOneAndDelete({ _id: req.params.id, organization: req.auth!.organization });
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
