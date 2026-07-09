import { Router } from 'express';
import { SupplierEvaluation } from '../models/SupplierEvaluation';
import { Supplier }           from '../models/Supplier';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.organization) filter.organization = req.query.organization;
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

router.post('/', async (req, res) => {
  try { res.status(201).json({ success: true, data: await SupplierEvaluation.create(req.body) }); }
  catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const evaluation = await SupplierEvaluation.findByIdAndUpdate(
      req.params.id,
      { reviewStatus: 'APPROVED', reviewedBy: req.body.reviewedBy, approvedAt: new Date() },
      { returnDocument: 'after' }
    ).populate('supplier');
    if (!evaluation) return res.status(404).json({ success: false, error: 'Not found' });

    const allApproved = await SupplierEvaluation.find({ supplier: evaluation.supplier, reviewStatus: 'APPROVED' });
    if (allApproved.length > 0) {
      const avg = (field: 'overallScore' | 'qualityScore' | 'deliveryScore') =>
        parseFloat((allApproved.reduce((s, e) => s + (e[field] as number), 0) / allApproved.length).toFixed(2));
      await Supplier.findByIdAndUpdate((evaluation.supplier as any)._id ?? evaluation.supplier, {
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

router.get('/approved-vendors', async (req, res) => {
  try {
    const filter: any = { approvalStatus: 'APPROVED' };
    if (req.query.organization) filter.organization = req.query.organization;
    res.json({ success: true, data: await Supplier.find(filter).sort({ overallRating: -1 }) });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
