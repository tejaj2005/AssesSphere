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
import { requireAuth }          from '../middleware/auth';
import { auditLogger }          from '../middleware/auditLogger';

const router = Router();

// Public — no token yet when hitting these.
router.use('/auth', authRoutes);

// Every other route needs a valid session, and gets its mutations auto-logged to the audit trail.
const protect = [requireAuth, auditLogger];

router.use('/admin',               ...protect, adminRoutes);
router.use('/inspection-plans',    ...protect, inspectionPlanRoutes);
router.use('/inspection-reports',  ...protect, inspectionReportRoutes);
router.use('/quality-plans',       ...protect, productQualityPlanRoutes);
router.use('/supplier-evaluations',...protect, supplierEvaluationRoutes);
router.use('/dashboard',           ...protect, dashboardRoutes);
router.use('/roles',               ...protect, roleRoutes);
router.use('/documents',           ...protect, documentRoutes);
router.use('/production-plans',    ...protect, productionPlanRoutes);
router.use('/audit-log',           ...protect, auditLogRoutes);

// AI panels now send an auth header (src/hooks/useAI.ts) — same guard as everything else,
// but no auditLogger since these are AI generations, not entity mutations.
router.use('/ai', requireAuth, aiRoutes);

export default router;
