import { Response, NextFunction } from 'express';
import { AuditLogEntry } from '../models/AuditLogEntry';
import { AuthedRequest } from './auth';

const ENTITY_LABELS: Record<string, string> = {
  'products': 'Product',
  'components': 'Component',
  'manufacturing-stages': 'ManufacturingStage',
  'assembly-stages': 'AssemblyStage',
  'equipment': 'Equipment',
  'calibration-records': 'CalibrationRecord',
  'materials': 'Material',
  'material-types': 'MaterialType',
  'suppliers': 'Supplier',
  'supplier-eval-methods': 'SupplierEvalMethod',
  'inspection-types': 'InspectionType',
  'inspection-methods': 'InspectionMethod',
  'departments': 'Department',
  'organizations': 'Organization',
  'users': 'User',
  'inspection-plans': 'InspectionPlan',
  'inspection-reports': 'InspectionReport',
  'quality-plans': 'ProductQualityPlan',
  'supplier-evaluations': 'SupplierEvaluation',
  'roles': 'Role',
  'documents': 'MfgDocument',
  'production-plans': 'ProductionPlan',
};

const ACTION_BY_METHOD: Record<string, 'Created' | 'Updated' | 'Deleted'> = {
  POST: 'Created',
  PUT: 'Updated',
  DELETE: 'Deleted',
};

function resolveEntityType(path: string): string | null {
  for (const segment of path.split('/')) {
    if (ENTITY_LABELS[segment]) return ENTITY_LABELS[segment];
  }
  return null;
}

/**
 * Fire-and-forget audit trail. Mounted alongside requireAuth on the protected route groups,
 * so it never needs the individual route handlers to know it exists.
 */
export function auditLogger(req: AuthedRequest, res: Response, next: NextFunction) {
  const action = ACTION_BY_METHOD[req.method];
  const entityType = action ? resolveEntityType(req.path) : null;

  if (!action || !entityType || !req.auth) return next();

  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
      const entityName = body?.data?.name || body?.data?.title || body?.data?.planId || body?.data?._id || req.params.id || 'record';
      AuditLogEntry.create({
        action,
        entityType,
        entityName: String(entityName),
        entityId: body?.data?._id || req.params.id,
        performedBy: req.auth!.userId,
        organization: req.auth!.organization,
      }).catch(() => {});
    }
    return originalJson(body);
  }) as typeof res.json;

  next();
}
