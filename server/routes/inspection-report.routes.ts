import { Router, Response } from 'express';
import { InspectionReport } from '../models/InspectionReport';
import { InspectionPlan }   from '../models/InspectionPlan';
import { AuthedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { organization: req.auth!.organization };
    if (req.query.status)        filter.status        = req.query.status;
    if (req.query.inspector)     filter.inspector     = req.query.inspector;
    if (req.query.plan)          filter.plan          = req.query.plan;
    if (req.query.overallResult) filter.overallResult = req.query.overallResult;
    // InspectionReport has no planType of its own (only the referenced plan does) — resolve
    // matching plan ids first. Without this, a type-specific dashboard fetching reports under
    // a shared organization-wide limit can have its type's reports crowded out of that window
    // by a more frequent report type, silently understating its own counts.
    if (req.query.planType) {
      const planFilter: Record<string, any> = { planType: req.query.planType, organization: req.auth!.organization };
      const matchingPlans = await InspectionPlan.find(planFilter).select('_id');
      filter.plan = { $in: matchingPlans.map((p) => p._id) };
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.inspectionDate = {};
      if (req.query.dateFrom) filter.inspectionDate.$gte = new Date(req.query.dateFrom as string);
      if (req.query.dateTo)   filter.inspectionDate.$lte = new Date(req.query.dateTo as string);
    }
    const page = parseInt(req.query.page as string)||1, limit = parseInt(req.query.limit as string)||20;
    const [data, total] = await Promise.all([
      InspectionReport.find(filter)
        .populate('plan','planId title planType')
        .populate('inspector','name email role')
        .populate('reviewedBy','name').populate('approvedBy','name')
        .sort({ inspectionDate: -1 }).skip((page-1)*limit).limit(limit),
      InspectionReport.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const report = await InspectionReport.findOne({ _id: req.params.id, organization: req.auth!.organization })
      .populate('plan').populate('inspector','name email role')
      .populate('reviewedBy','name').populate('approvedBy','name')
      .populate('aiFindings').populate('checklistResults.equipment');
    if (!report) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: report });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req: AuthedRequest, res: Response) => {
  try {
    const report = await InspectionReport.create({ ...req.body, organization: req.auth!.organization });
    await InspectionPlan.findOneAndUpdate({ _id: report.plan, organization: req.auth!.organization }, { status: 'ACTIVE' });
    res.status(201).json({ success: true, data: report });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const { organization, ...rest } = req.body;
    const report = await InspectionReport.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, rest, { returnDocument: 'after', runValidators: true });
    if (!report) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: report });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id/submit', async (req: AuthedRequest, res: Response) => {
  try {
    const r = await InspectionReport.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, { status: 'SUBMITTED', submittedAt: new Date() }, { returnDocument: 'after' });
    if (!r) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: r });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id/approve', async (req: AuthedRequest, res: Response) => {
  try {
    const { reviewComments } = req.body;
    // approvedBy is the authenticated caller, not a client-supplied id — otherwise anyone could
    // forge who approved a report in what's meant to be a compliance record.
    const r = await InspectionReport.findOneAndUpdate(
      { _id: req.params.id, organization: req.auth!.organization },
      { status: 'APPROVED', approvedBy: req.auth!.userId, approvedAt: new Date(), reviewComments },
      { returnDocument: 'after' }
    );
    if (!r) return res.status(404).json({ success: false, error: 'Not found' });
    await InspectionPlan.findOneAndUpdate({ _id: r.plan, organization: req.auth!.organization }, { status: 'COMPLETED' });
    res.json({ success: true, data: r });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id/reject', async (req: AuthedRequest, res: Response) => {
  try {
    const { rejectionReason } = req.body;
    const r = await InspectionReport.findOneAndUpdate(
      { _id: req.params.id, organization: req.auth!.organization },
      { status: 'REJECTED', reviewedBy: req.auth!.userId, reviewedAt: new Date(), rejectionReason },
      { returnDocument: 'after' }
    );
    if (!r) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: r });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id/hold', async (req: AuthedRequest, res: Response) => {
  try {
    const r = await InspectionReport.findOneAndUpdate({ _id: req.params.id, organization: req.auth!.organization }, { status: 'ON_HOLD' }, { returnDocument: 'after' });
    if (!r) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: r });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
