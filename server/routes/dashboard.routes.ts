import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { InspectionReport }  from '../models/InspectionReport';
import { InspectionPlan }    from '../models/InspectionPlan';
import { Equipment }         from '../models/Equipment';
import { Supplier }          from '../models/Supplier';
import { AIRiskScore }       from '../models/AIRiskScore';
import { ProductQualityPlan }from '../models/ProductQualityPlan';
import { AuthedRequest } from '../middleware/auth';

const router = Router();

// Every dashboard below is scoped to the authenticated caller's own organization (from the
// verified JWT) rather than a client-suppliable `?organization=` query param — otherwise any
// authenticated user could pull another organization's KPIs, risk scores, and pending-approval
// lists just by changing the query string.
const orgFilterOf = (req: AuthedRequest) => ({ organization: req.auth!.organization });

router.get('/management', async (req: AuthedRequest, res: Response) => {
  try {
    const orgFilter = orgFilterOf(req);

    const [kpiAgg, monthly, statusDist, topRisk, calibSummary, pqpStatus] = await Promise.all([
      InspectionReport.aggregate([
        { $match: orgFilter },
        { $group: { _id: null, total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status','APPROVED'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status','SUBMITTED'] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ['$status','REJECTED'] }, 1, 0] } }, avgPassRate: { $avg: { $cond: [{ $gt: ['$passCount', 0] }, { $divide: ['$passCount', { $add: ['$passCount','$failCount','$marginalCount'] }] }, 0] } } } },
      ]),
      InspectionReport.aggregate([
        { $match: { ...orgFilter, inspectionDate: { $gte: new Date(Date.now() - 180*86400000) } } },
        { $group: { _id: { month: { $month: '$inspectionDate' }, year: { $year: '$inspectionDate' } }, count: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status','APPROVED'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$overallResult','FAIL'] }, 1, 0] } } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      InspectionReport.aggregate([{ $match: orgFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      AIRiskScore.find(orgFilter as any).sort({ overallScore: -1 }).limit(5).lean(),
      Equipment.aggregate([{ $match: orgFilter }, { $group: { _id: '$calibrationStatus', count: { $sum: 1 } } }]),
      ProductQualityPlan.aggregate([{ $match: orgFilter }, { $group: { _id: '$overallStatus', count: { $sum: 1 } } }]),
    ]);

    const kpi = kpiAgg[0] || { total: 0, approved: 0, pending: 0, rejected: 0, avgPassRate: 0 };
    res.json({
      success: true,
      data: {
        kpis: { totalInspections: kpi.total, approvedCount: kpi.approved, pendingReview: kpi.pending, rejectedCount: kpi.rejected, approvalRate: Math.round((kpi.avgPassRate || 0) * 100) },
        monthlyTrend: monthly, statusDistribution: statusDist, topRiskScores: topRisk,
        equipmentCalibration: calibSummary, productQualityStatus: pqpStatus,
      },
    });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/production', async (req: AuthedRequest, res: Response) => {
  try {
    const filter = orgFilterOf(req);
    // pendingReports/recentReports below are capped at 10 for the dashboard's "recent items"
    // lists — real accurate KPI numbers need their own uncapped counts, not `.length` of a
    // capped-and-sorted list (which silently under-reports once there are more than 10).
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [planStats, pendingReports, recentReports, pendingCount, approvedThisMonthCount] = await Promise.all([
      InspectionPlan.aggregate([{ $match: { ...filter, planType: { $in: ['R3_MANUFACTURING','R4_ASSEMBLY'] } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      InspectionReport.find({ ...filter, status: 'SUBMITTED' }).populate('plan','title planType').populate('inspector','name').sort({ submittedAt: -1 }).limit(10),
      InspectionReport.find({ ...filter, status: { $in: ['APPROVED','REJECTED'] } }).populate('plan','title planType').sort({ updatedAt: -1 }).limit(10),
      InspectionReport.countDocuments({ ...filter, status: 'SUBMITTED' }),
      InspectionReport.countDocuments({ ...filter, status: 'APPROVED', updatedAt: { $gte: startOfMonth, $lt: startOfNextMonth } }),
    ]);
    res.json({ success: true, data: { planStats, pendingReports, recentReports, pendingCount, approvedThisMonthCount } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/quality', async (req: AuthedRequest, res: Response) => {
  try {
    const filter = orgFilterOf(req);
    const [pendingApprovals, recentGapAnalyses, capaStats] = await Promise.all([
      InspectionReport.find({ ...filter, status: 'SUBMITTED' }).populate('plan','title planType').populate('inspector','name').sort({ submittedAt: -1 }).limit(20),
      mongoose.connection.collection('aigapanalyses').find({}).sort({ analyzedAt: -1 }).limit(5).toArray(),
      mongoose.connection.collection('aicapas').aggregate([{ $group: { _id: '$implementationStatus', count: { $sum: 1 } } }]).toArray(),
    ]);
    res.json({ success: true, data: { pendingApprovals, recentGapAnalyses, capaStats } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/stores', async (req: AuthedRequest, res: Response) => {
  try {
    const orgFilter = orgFilterOf(req);
    const [supplierOverview, pendingMaterialPlans, approvedVendors] = await Promise.all([
      Supplier.aggregate([{ $match: orgFilter }, { $group: { _id: '$approvalStatus', count: { $sum: 1 }, avgRating: { $avg: '$overallRating' } } }]),
      InspectionPlan.find({ ...orgFilter, planType: 'R1_MATERIAL', status: 'ACTIVE' }).populate('material','name materialId').populate('supplier','name').populate('assignedInspectors','name').sort({ dueDate: 1 }).limit(10),
      Supplier.find({ ...orgFilter, approvalStatus: 'APPROVED' }).sort({ overallRating: -1 }).limit(10),
    ]);
    res.json({ success: true, data: { supplierOverview, pendingMaterialPlans, approvedVendors } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/inspector', async (req: AuthedRequest, res: Response) => {
  try {
    const { inspectorId } = req.query;
    if (!inspectorId) return res.status(400).json({ success: false, error: 'inspectorId required' });
    const inspObjId = new mongoose.Types.ObjectId(inspectorId as string);
    const orgFilter = orgFilterOf(req);
    const planFilter: any = { ...orgFilter, assignedInspectors: inspObjId, status: 'ACTIVE' };
    const draftFilter: any = { ...orgFilter, inspector: inspObjId, status: { $in: ['DRAFT','SUBMITTED'] } };
    const completedFilter: any = { ...orgFilter, inspector: inspObjId, status: 'APPROVED', inspectionDate: { $gte: new Date(new Date().setDate(1)) } };
    const [assignedPlans, myDrafts, completedThisMonth] = await Promise.all([
      InspectionPlan.find(planFilter).populate('product','name').populate('material','name').populate('inspectionType','name category').sort({ dueDate: 1 }),
      InspectionReport.find(draftFilter).populate('plan','title planType').sort({ updatedAt: -1 }).limit(10),
      InspectionReport.countDocuments(completedFilter),
    ]);
    res.json({ success: true, data: { assignedPlans, myDrafts, completedThisMonth } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
