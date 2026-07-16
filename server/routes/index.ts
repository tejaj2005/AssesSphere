import { Router } from 'express';
import authRoutes               from './auth.routes';
import adminRoutes              from './admin.routes';
import inspectionPlanRoutes     from './inspection-plan.routes';
import inspectionReportRoutes   from './inspection-report.routes';
import productQualityPlanRoutes from './product-quality-plan.routes';
import supplierEvaluationRoutes from './supplier-evaluation.routes';
import dashboardRoutes          from './dashboard.routes';
import roleRoutes               from './role.routes';
import documentRoutes           from './document.routes';
import productionPlanRoutes     from './production-plan.routes';
import auditLogRoutes           from './audit-log.routes';
import aiRoutes                 from '../ai/routes/ai.routes';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLogger }          from '../middleware/auditLogger';

const router = Router();

// Public — no token yet when hitting these.
router.use('/auth', authRoutes);

// Every other route needs a valid session, and gets its mutations auto-logged to the audit trail.
const protect = [requireAuth, auditLogger];

// Per-route role checks live inside these routers (their sub-routes serve different role sets —
// e.g. inspectors submit reports, managers approve them). The four whole-router single-role
// surfaces below are guarded here at the mount, since every sub-route shares the same role set:
// roles/documents/audit-log are Admin-only master-data/admin surfaces, and production-plans is
// exclusively the Production Manager's. requireRole is defence-in-depth behind requireAuth — the
// frontend already hides these by role, but that's UI convenience, not a real boundary.
router.use('/admin',               ...protect, adminRoutes);
router.use('/inspection-plans',    ...protect, inspectionPlanRoutes);
router.use('/inspection-reports',  ...protect, inspectionReportRoutes);
router.use('/quality-plans',       ...protect, productQualityPlanRoutes);
router.use('/supplier-evaluations',...protect, supplierEvaluationRoutes);
router.use('/dashboard',           ...protect, dashboardRoutes);
router.use('/roles',               ...protect, requireRole('Admin'), roleRoutes);
router.use('/documents',           ...protect, requireRole('Admin'), documentRoutes);
router.use('/production-plans',    ...protect, requireRole('ProductionManager'), productionPlanRoutes);
router.use('/audit-log',           ...protect, requireRole('Admin'), auditLogRoutes);

// AI panels now send an auth header (src/hooks/useAI.ts) — same guard as everything else,
// but no auditLogger since these are AI generations, not entity mutations.
router.use('/ai', requireAuth, aiRoutes);

export default router;
