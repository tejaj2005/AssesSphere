export type Status = 'Active' | 'Inactive';
export type CalibrationStatus = 'COMPLETED' | 'PENDING';
export type RoleName = 'Admin' | 'Management' | 'Production Manager' | 'Stores Manager' | 'Quality Manager' | 'Inspector';

export interface Organization {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  status: Status;
  createdAt: string;
}

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Record<string, Permission>;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  roleId: string;
  departmentId: string;
  status: Status;
  createdAt: string;
  phone?: string;
  username?: string;
  designation?: string;
  dateOfJoining?: string;
  /** Data URL (base64) or remote URL of the user's profile photo. */
  photo?: string;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  manufacturingStageIds: string[];
  assemblingStageIds: string[];
  createdAt: string;
}

export interface ProductComponent {
  id: string;
  name: string;
  code: string;
  productId: string;
  createdAt: string;
  componentType?: string;
  uom?: string;
  supplierId?: string;
  minimumStock?: number | string;
  leadTime?: number | string;
  certificate?: boolean;
  storage?: string;
  qualityStandard?: string;
  notes?: string;
}

export type StageStatus = 'ACTIVE' | 'INACTIVE';

// Shared shape for manufacturing & assembly process stages.
// Carries time-study (standard time), motion-study (setup time) and
// methods-study (method) attributes plus lifecycle timestamps.
export interface ProcessStage {
  id: string;
  name: string;
  order: number;
  description?: string;       // Methods study: documented work method / SOP summary
  workCenter?: string;        // Responsible department / work centre
  standardTimeMin?: number;   // Time study: standard cycle time per unit (minutes)
  setupTimeMin?: number;      // Motion study: setup / changeover time (minutes)
  criticalToQuality?: boolean;// CTQ control point flag
  status?: StageStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type ManufacturingStage = ProcessStage;

export type AssemblingStage = ProcessStage;

export interface InspectionType {
  id: string;
  name: string;
}

export interface InspectionEquipment {
  id: string;
  name: string;
  code: string;
  supplier: string;
  calibrationStatus: CalibrationStatus;
  calibrationDueDate: string;
}

export interface InspectionMethod {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  code?: string;
  methodType?: string;
  referenceStandard?: string;
  equipmentIds?: string[];
  sampleSize?: string;
  acceptanceCriteria?: string;
  approvalStatus?: string;
  approvedById?: string;
  effectiveDate?: string;
  sopFile?: string | string[];
}

export type DocumentCategory = 'Procedure' | 'Policy' | 'Guideline' | 'Checklist' | 'Template' | 'Design' | 'Report' | 'Certificate';
export type DocumentFileType = 'PDF' | 'DOCX' | 'XLSX' | 'DWG' | 'IMAGE';

export interface MfgDocument {
  id: string;
  name: string;
  code: string;
  description: string;
  manufacturingStageId: string;
  category?: DocumentCategory;
  fileType?: DocumentFileType;
  fileName?: string;
  fileSize?: string;
  version?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  /** Data URL (base64) of the actually uploaded file, when available. */
  fileData?: string;
}

export interface Material {
  id: string;
  name: string;
  code: string;
  materialTypeId: string;
}

export interface MaterialType {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  materialIds: string[];
}

export interface SupplierEvalMethod {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: 'Created' | 'Updated' | 'Deleted';
  entityType: string;
  entityName: string;
  userName: string;
  timestamp: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  address?: string;
  bio?: string;
}

// ─── INSPECTION DATA ──────────────────────────────────────
export type RAGStatus = 'GREEN' | 'AMBER' | 'RED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED';
export type PlanStatus = 'DRAFT' | 'SUBMITTED' | 'ACTIVE' | 'COMPLETED';
export type InspectionRecordType = 'MANUFACTURING' | 'ASSEMBLING' | 'MATERIAL' | 'COMPONENT' | 'FINAL_PRODUCT';
export type PlanType = 'MANUFACTURING' | 'ASSEMBLING' | 'MATERIAL' | 'COMPONENT';

export interface InspectionRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  productCode: string;
  type: InspectionRecordType;
  stageName?: string;
  stageId?: string;
  materialName?: string;
  materialId?: string;
  supplierName?: string;
  componentName?: string;
  componentId?: string;
  assemblingResource?: string;
  inspectionDetails: string;
  parameterName: string;
  unit: string;
  targetValue: number;
  actualValue: number;
  variance: number;
  status: RAGStatus;
  inspectorName: string;
  inspectorId: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewStatus: ReviewStatus;
  observations?: string;
  equipmentUsed?: string;
  evidence?: string[];
  reviewComment?: string;
}

export interface InspectionParameter {
  id: string;
  description: string;
  equipmentId: string;
  equipmentName: string;
  parameterName: string;
  unit: string;
  targetValue: number;
  actualValue?: number;
  variance?: number;
  status?: RAGStatus;
}

export interface InspectionPlan {
  id: string;
  planCode: string;
  type: PlanType;
  productId: string;
  productName: string;
  stageName?: string;
  stageId?: string;
  materialName?: string;
  materialId?: string;
  supplierId?: string;
  supplierName?: string;
  componentName?: string;
  componentId?: string;
  materialType?: string;
  assemblingResource?: string;
  parameters: InspectionParameter[];
  inspectorId?: string;
  inspectorName?: string;
  inspectionDate?: string;
  status: PlanStatus;
  reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: string;
  createdAt: string;
}

export interface ResourceAssignment {
  id: string;
  inspectorId: string;
  inspectorName: string;
  planId: string;
  planType: string;
  productName: string;
  stageName: string;
  assignedDate: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface SupplierEvaluation {
  id: string;
  supplierId: string;
  supplierName: string;
  evaluationDate: string;
  qualityRating: number;
  deliveryRating: number;
  quantityRating: number;
  qualityStatus: RAGStatus;
  deliveryStatus: RAGStatus;
  quantityStatus: RAGStatus;
  overallStatus: RAGStatus;
  evaluatedBy: string;
  approvedBy?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  servicesDetails?: string;
}

// ─── STORES MANAGER ────────────────────────────────────
export type MaterialUnit = 'kg' | 'pcs' | 'liters' | 'meters';
export type MaterialPlanStatus = 'DRAFT' | 'SUBMITTED' | 'INSPECTED' | 'APPROVED' | 'REJECTED' | 'HOLD';
export type InspectionMethodType = 'PHYSICAL_TEST' | 'ANALYTICAL_TEST' | 'OBSERVATION';

export interface MaterialInspectionParam {
  id: string;
  parameterName: string;
  unit: string;
  targetValue: number;
  actualValue?: number;
  variance?: number;
  status?: RAGStatus;
  observation?: string;
}

export interface MaterialReceivedPlan {
  id: string;
  planCode: string;
  date: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: MaterialUnit;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  inspectorId?: string;
  inspectorName?: string;
  method: InspectionMethodType;
  parameters: MaterialInspectionParam[];
  observations?: string;
  overallStatus: MaterialPlanStatus;
  reviewStatus: ReviewStatus;
  createdBy: string;
  createdAt: string;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedDate?: string;
}

export interface ApprovedVendor {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  servicesDetails: string;
  approvedDate: string;
  reviewedBy: string;
  approvedBy: string;
  status: 'APPROVED' | 'SUSPENDED' | 'REMOVED';
  suspensionReason?: string;
}

export interface MaterialStockStatement {
  id: string;
  date: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  totalAvailable: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  category: string;
  preparedBy: string;
  unit: string;
}

// ─── QUALITY MANAGER ───────────────────────────────────
export interface QualityPlanStage {
  stageId: string;
  stageName: string;
  requirements: string;
  checklistId?: string;
  checklistName?: string;
  equipmentIds: string[];
  inspectorId?: string;
  inspectorName?: string;
  reportStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

export interface ProductQualityPlan {
  id: string;
  planCode: string;
  date: string;
  productId: string;
  productName: string;
  productCode: string;
  manufacturingStages: QualityPlanStage[];
  assemblingStages: QualityPlanStage[];
  finishedProduct: QualityPlanStage;
  reviewerId: string;
  reviewerName: string;
  reviewDate?: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  pmAcknowledged: boolean;
  completionPercentage: number;
  createdAt: string;
}

export interface InspectorAssignment {
  id: string;
  planId: string;
  planCode: string;
  planType: 'MATERIAL_RECEIVED' | 'MANUFACTURING' | 'ASSEMBLING' | 'COMPONENT';
  productName: string;
  stageName: string;
  inspectorId: string;
  inspectorName: string;
  assignedDate: string;
  assignedBy: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export type ChecklistType = 'MANUFACTURING' | 'ASSEMBLING' | 'FINAL_PRODUCT';
export type ChecklistObservation = 'PASS' | 'FAIL' | 'NOTE' | 'PENDING';

export interface ChecklistItem {
  id: string;
  slNo: number;
  item: string;
  observation: ChecklistObservation;
  note?: string;
  performedBy?: string;
  performedDate?: string;
}

export interface InspectionChecklist {
  id: string;
  checklistCode: string;
  type: ChecklistType;
  productId: string;
  productName: string;
  linkedPlanId?: string;
  items: ChecklistItem[];
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  createdBy: string;
  createdAt: string;
}

export interface CalibrationApproval {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentCode: string;
  dueDate: string;
  calibrationLab: string;
  certificateNumber: string;
  calibrationStandard: string;
  result: 'PASS' | 'FAIL';
  nextDueDate: string;
  inspectorRemarks: string;
  certificateFileName: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedDate?: string;
  rejectionComment?: string;
}

// ─── INSPECTOR ─────────────────────────────────────────
export type InspectorReportType = 'MATERIAL' | 'COMPONENT' | 'ASSEMBLY' | 'FINAL_PRODUCT' | 'CALIBRATION';
export type InspectorReportStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'L1_APPROVED' | 'FINAL_APPROVED' | 'REJECTED' | 'INFO_REQUESTED';

export interface ReportParameter {
  id: string;
  parameterName: string;
  unit: string;
  targetValue: number;
  readings: number[];
  actualValue: number;
  variance: number;
  status: RAGStatus;
  equipment: string;
  observation?: string;
}

export interface ReportChecklistItem {
  id: string;
  item: string;
  result: ChecklistObservation;
  note?: string;
}

export interface InspectionReport {
  id: string;
  reportCode: string;
  type: InspectorReportType;
  planId?: string;
  planCode?: string;
  productId?: string;
  productName?: string;
  materialName?: string;
  supplierName?: string;
  componentName?: string;
  stageName?: string;
  assemblerResource?: string;
  parameters: ReportParameter[];
  checklistItems?: ReportChecklistItem[];
  observations: string;
  evidenceFiles: string[];
  overallStatus: 'APPROVED' | 'REJECTED' | 'HOLD';
  inspectorId: string;
  inspectorName: string;
  inspectionDate: string;
  submittedDate?: string;
  reportStatus: InspectorReportStatus;
  l1ReviewerId?: string;
  l1ReviewerName?: string;
  l1ReviewDate?: string;
  l1Comment?: string;
  qmReviewerId?: string;
  qmReviewerName?: string;
  qmReviewDate?: string;
  qmComment?: string;
}

export interface InspectorTask {
  id: string;
  reportId?: string;
  planId: string;
  planCode: string;
  type: InspectorReportType;
  productName: string;
  stageName: string;
  dueDate: string;
  equipment: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionComment?: string;
}
