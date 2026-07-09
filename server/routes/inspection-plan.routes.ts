import { Router } from 'express';
import { InspectionPlan } from '../models/InspectionPlan';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.planType)     filter.planType     = req.query.planType;
    if (req.query.status)       filter.status       = req.query.status;
    if (req.query.product)      filter.product      = req.query.product;
    if (req.query.inspector)    filter.assignedInspectors = req.query.inspector;
    const page = parseInt(req.query.page as string)||1;
    const limit= parseInt(req.query.limit as string)||20;
    const [data, total] = await Promise.all([
      InspectionPlan.find(filter)
        .populate('product','name productId').populate('material','name materialId')
        .populate('assignedInspectors','name email role').populate('inspectionType','name category')
        .sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
      InspectionPlan.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const plan = await InspectionPlan.findById(req.params.id)
      .populate('product').populate('material').populate('component')
      .populate('manufacturingStage').populate('assemblyStage').populate('supplier')
      .populate('inspectionType').populate('assignedInspectors','name email role')
      .populate('checklistTemplate.equipment').populate('checklistTemplate.inspectionMethod');
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ success: true, data: await InspectionPlan.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const plan = await InspectionPlan.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id/activate', async (req, res) => {
  try {
    const plan = await InspectionPlan.findByIdAndUpdate(req.params.id, { status: 'ACTIVE' }, { returnDocument: 'after' });
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id/assign-inspector', async (req, res) => {
  try {
    const plan = await InspectionPlan.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { assignedInspectors: req.body.inspectorId } },
      { returnDocument: 'after' }
    );
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await InspectionPlan.findByIdAndUpdate(req.params.id, { status: 'CANCELLED' }); res.json({ success: true }); }
  catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
