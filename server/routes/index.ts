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

const router = Router();

router.use('/auth',                authRoutes);
router.use('/admin',               adminRoutes);
router.use('/inspection-plans',    inspectionPlanRoutes);
router.use('/inspection-reports',  inspectionReportRoutes);
router.use('/quality-plans',       productQualityPlanRoutes);
router.use('/supplier-evaluations',supplierEvaluationRoutes);
router.use('/dashboard',           dashboardRoutes);
router.use('/roles',               roleRoutes);
router.use('/documents',           documentRoutes);
router.use('/production-plans',    productionPlanRoutes);
router.use('/audit-log',           auditLogRoutes);
router.use('/ai',                  aiRoutes);

export default router;
