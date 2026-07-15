import { Router, Response } from 'express';
import { SupplierEvaluation } from '../models/SupplierEvaluation';
import { Supplier }           from '../models/Supplier';
import { AuthedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { organization: req.auth!.organization };
    if (req.query.supplier)     filter.supplier     = req.query.supplier;
    if (req.query.reviewStatus) filter.reviewStatus = req.query.reviewStatus;
    const data = await SupplierEvaluation.find(filter)
      .populate('supplier','name supplierId category')
      .populate('evaluatedBy','name email')
      .populate('reviewedBy','name')
      .sort({ evaluationDate: -1 });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req: AuthedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await SupplierEvaluation.create({ ...req.body, organization: req.auth!.organization }) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id/approve', async (req: AuthedRequest, res: Response) => {
  try {
    // reviewedBy is the authenticated caller, not a client-supplied id — otherwise anyone could
    // forge who approved an evaluation in what's meant to be a compliance record.
    const evaluation = await SupplierEvaluation.findOneAndUpdate(
      { _id: req.params.id, organization: req.auth!.organization },
      { reviewStatus: 'APPROVED', reviewedBy: req.auth!.userId, approvedAt: new Date() },
      { returnDocument: 'after' }
    ).populate('supplier');
    if (!evaluation) return res.status(404).json({ success: false, error: 'Not found' });

    const allApproved = await SupplierEvaluation.find({ supplier: evaluation.supplier, reviewStatus: 'APPROVED' });
    if (allApproved.length > 0) {
      const avg = (field: 'overallScore' | 'qualityScore' | 'deliveryScore') =>
        parseFloat((allApproved.reduce((s, e) => s + (e[field] as number), 0) / allApproved.length).toFixed(2));
      await Supplier.findOneAndUpdate({ _id: (evaluation.supplier as any)._id ?? evaluation.supplier, organization: req.auth!.organization }, {
        overallRating:     avg('overallScore'),
        qualityRating:     avg('qualityScore'),
        deliveryRating:    avg('deliveryScore'),
        evaluationCount:   allApproved.length,
        lastEvaluationDate:evaluation.evaluationDate,
      });
    }
    res.json({ success: true, data: evaluation });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/approved-vendors', async (req: AuthedRequest, res: Response) => {
  try {
    const filter: any = { approvalStatus: 'APPROVED', organization: req.auth!.organization };
    res.json({ success: true, data: await Supplier.find(filter).sort({ overallRating: -1 }) });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
