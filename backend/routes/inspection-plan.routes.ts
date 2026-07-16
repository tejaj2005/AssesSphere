import { Router, Response } from 'express';
import { InspectionPlan } from '../models/InspectionPlan';
import { AuthedRequest, requireRole } from '../middleware/auth';

const router = Router();

// Reads stay open to any authenticated org member (dashboards, timelines and the inspector's
// own queue all list plans, org-scoped). Writes are split by workflow role: Production and
// Stores managers author/edit/cancel plans (R3/R4 and R1_MATERIAL respectively), while the
// Quality manager is the one who activates a plan and assigns inspectors to it.
const planAuthors = requireRole('ProductionManager', 'StoresManager');
const planScheduler = requireRole('QualityManager');

router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { organization: req.auth!.organization };
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

router.get('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const plan = await InspectionPlan.findOne({ _id: req.params.id, organization: req.auth!.organization })
      .populate('product').populate('material').populate('component')
      .populate('manufacturingStage').populate('assemblyStage').populate('supplier')
      .populate('inspectionType').populate('assignedInspectors','name email role')
      .populate('checklistTemplate.equipment').populate('checklistTemplate.inspectionMethod');
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', planAuthors, async (req: AuthedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await InspectionPlan.create({ ...req.body, organization: req.auth!.organization }) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', planAuthors, async (req: AuthedRequest, res: Response) => {
  try {
    const { organization, ...rest } = req.body;
    const plan = await InspectionPlan.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, rest, { returnDocument: 'after' });
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id/activate', planScheduler, async (req: AuthedRequest, res: Response) => {
  try {
    const plan = await InspectionPlan.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, { status: 'ACTIVE' }, { returnDocument: 'after' });
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id/assign-inspector', planScheduler, async (req: AuthedRequest, res: Response) => {
  try {
    const plan = await InspectionPlan.findOneAndUpdate(
      { _id: req.params.id, organization: req.auth!.organization },
      { $addToSet: { assignedInspectors: req.body.inspectorId } },
      { returnDocument: 'after' }
    );
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const plan = await InspectionPlan.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, { status: 'CANCELLED' });
    if (!plan) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
