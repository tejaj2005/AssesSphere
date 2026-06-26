import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type {
  Organization, Department, Role, User, Product, ProductComponent,
  ManufacturingStage, AssemblingStage, InspectionType, InspectionEquipment,
  InspectionMethod, MfgDocument, Material, MaterialType, Supplier,
  SupplierEvalMethod, AuditLogEntry,
  InspectionRecord, InspectionPlan, ResourceAssignment, SupplierEvaluation,
} from '@/types';
import type {
  MaterialReceivedPlan, ApprovedVendor, MaterialStockStatement,
  ProductQualityPlan, InspectorAssignment, InspectionChecklist, CalibrationApproval,
  InspectionReport, InspectorTask, ProductionPlan,
} from '@/types';
import * as mock from '@/data/mockData';
import * as inspect from '@/data/inspectionData';
import * as moduleData from '@/data/moduleData';
import { nextId } from '@/lib/utils';

type Result = { success: boolean; error?: string };
type StageInput = Partial<Omit<ManufacturingStage, 'id' | 'order' | 'createdAt' | 'updatedAt'>> & { name: string };

interface DataContextType {
  organization: Organization;
  departments: Department[];
  users: User[];
  roles: Role[];
  products: Product[];
  components: ProductComponent[];
  manufacturingStages: ManufacturingStage[];
  assemblingStages: AssemblingStage[];
  inspectionTypes: InspectionType[];
  equipment: InspectionEquipment[];
  inspectionMethods: InspectionMethod[];
  documents: MfgDocument[];
  materials: Material[];
  materialTypes: MaterialType[];
  suppliers: Supplier[];
  evalMethods: SupplierEvalMethod[];
  auditLog: AuditLogEntry[];

  updateOrganization: (data: Partial<Organization>) => void;

  addDepartment: (data: Omit<Department, 'id' | 'createdAt'>) => Result;
  updateDepartment: (id: string, data: Partial<Department>) => Result;
  deleteDepartment: (id: string) => Result;

  addUser: (data: Omit<User, 'id' | 'createdAt'>) => Result;
  updateUser: (id: string, data: Partial<User>) => Result;
  deleteUser: (id: string) => Result;
  bulkUpdateUserStatus: (ids: string[], status: 'Active' | 'Inactive') => void;

  addRole: (data: Omit<Role, 'id'>) => Result;
  updateRole: (id: string, data: Partial<Role>) => Result;
  deleteRole: (id: string) => Result;

  addProduct: (data: Omit<Product, 'id' | 'createdAt'>) => Result;
  updateProduct: (id: string, data: Partial<Product>) => Result;
  deleteProduct: (id: string) => Result;

  addComponent: (data: Omit<ProductComponent, 'id' | 'createdAt'>) => Result;
  updateComponent: (id: string, data: Partial<ProductComponent>) => Result;
  deleteComponent: (id: string) => Result;

  addManufacturingStage: (data: StageInput) => Result;
  updateManufacturingStage: (id: string, data: Partial<ManufacturingStage>) => Result;
  deleteManufacturingStage: (id: string) => Result;
  reorderManufacturingStages: (ids: string[]) => void;

  addAssemblingStage: (data: StageInput) => Result;
  updateAssemblingStage: (id: string, data: Partial<AssemblingStage>) => Result;
  deleteAssemblingStage: (id: string) => Result;
  reorderAssemblingStages: (ids: string[]) => void;

  addInspectionType: (data: { name: string }) => Result;
  updateInspectionType: (id: string, data: Partial<InspectionType>) => Result;
  deleteInspectionType: (id: string) => Result;

  addEquipment: (data: Omit<InspectionEquipment, 'id'>) => Result;
  updateEquipment: (id: string, data: Partial<InspectionEquipment>) => Result;
  deleteEquipment: (id: string) => Result;

  addInspectionMethod: (data: Omit<InspectionMethod, 'id' | 'isSystem'>) => Result;
  updateInspectionMethod: (id: string, data: Partial<InspectionMethod>) => Result;
  deleteInspectionMethod: (id: string) => Result;

  addDocument: (data: Omit<MfgDocument, 'id'>) => Result;
  updateDocument: (id: string, data: Partial<MfgDocument>) => Result;
  deleteDocument: (id: string) => Result;

  addMaterial: (data: Omit<Material, 'id'>) => Result;
  updateMaterial: (id: string, data: Partial<Material>) => Result;
  deleteMaterial: (id: string) => Result;

  addMaterialType: (data: { name: string }) => Result;
  updateMaterialType: (id: string, data: Partial<MaterialType>) => Result;
  deleteMaterialType: (id: string) => Result;

  addSupplier: (data: Omit<Supplier, 'id'>) => Result;
  updateSupplier: (id: string, data: Partial<Supplier>) => Result;
  deleteSupplier: (id: string) => Result;

  addEvalMethod: (data: Omit<SupplierEvalMethod, 'id' | 'isSystem'>) => Result;
  updateEvalMethod: (id: string, data: Partial<SupplierEvalMethod>) => Result;
  deleteEvalMethod: (id: string) => Result;

  // Inspection data
  inspectionRecords: InspectionRecord[];
  inspectionPlans: InspectionPlan[];
  resourceAssignments: ResourceAssignment[];
  supplierEvaluations: SupplierEvaluation[];
  productionPlans: ProductionPlan[];

  addProductionPlan: (data: Omit<ProductionPlan, 'id' | 'createdAt' | 'planCode'>) => Result;
  updateProductionPlan: (id: string, data: Partial<ProductionPlan>) => Result;
  deleteProductionPlan: (id: string) => Result;

  addInspectionRecord: (data: Omit<InspectionRecord, 'id'>) => Result;
  updateInspectionRecord: (id: string, data: Partial<InspectionRecord>) => Result;
  reviewInspectionRecord: (id: string, action: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED', comment: string, reviewer: string) => Result;

  addInspectionPlan: (data: Omit<InspectionPlan, 'id' | 'createdAt'>) => Result;
  updateInspectionPlan: (id: string, data: Partial<InspectionPlan>) => Result;
  deleteInspectionPlan: (id: string) => Result;

  addResourceAssignment: (data: Omit<ResourceAssignment, 'id'>) => Result;
  updateResourceAssignment: (id: string, data: Partial<ResourceAssignment>) => Result;

  addSupplierEvaluation: (data: Omit<SupplierEvaluation, 'id'>) => Result;
  updateSupplierEvaluation: (id: string, data: Partial<SupplierEvaluation>) => Result;

  // SM / QM / Inspector data
  materialPlans: MaterialReceivedPlan[];
  approvedVendors: ApprovedVendor[];
  stockStatements: MaterialStockStatement[];
  qualityPlans: ProductQualityPlan[];
  inspectorAssignments: InspectorAssignment[];
  checklists: InspectionChecklist[];
  calibrationApprovals: CalibrationApproval[];
  inspectionReports: InspectionReport[];
  inspectorTasks: InspectorTask[];

  addMaterialPlan: (d: Omit<MaterialReceivedPlan, 'id' | 'createdAt' | 'planCode'>) => Result;
  updateMaterialPlan: (id: string, d: Partial<MaterialReceivedPlan>) => Result;
  deleteMaterialPlan: (id: string) => Result;
  reviewMaterialPlan: (id: string, action: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED', comment: string, reviewer: string) => Result;

  addApprovedVendor: (d: Omit<ApprovedVendor, 'id'>) => Result;
  updateApprovedVendor: (id: string, d: Partial<ApprovedVendor>) => Result;

  addStockStatement: (d: Omit<MaterialStockStatement, 'id'>) => Result;
  updateStockStatement: (id: string, d: Partial<MaterialStockStatement>) => Result;
  deleteStockStatement: (id: string) => Result;

  addQualityPlan: (d: Omit<ProductQualityPlan, 'id' | 'createdAt' | 'planCode'>) => Result;
  updateQualityPlan: (id: string, d: Partial<ProductQualityPlan>) => Result;
  deleteQualityPlan: (id: string) => Result;

  addInspectorAssignment: (d: Omit<InspectorAssignment, 'id'>) => Result;
  updateInspectorAssignment: (id: string, d: Partial<InspectorAssignment>) => Result;

  addChecklist: (d: Omit<InspectionChecklist, 'id' | 'createdAt' | 'checklistCode'>) => Result;
  updateChecklist: (id: string, d: Partial<InspectionChecklist>) => Result;
  deleteChecklist: (id: string) => Result;

  approveCalibration: (id: string, approver: string) => Result;
  rejectCalibration: (id: string, comment: string, approver: string) => Result;
  addCalibrationApproval: (d: Omit<CalibrationApproval, 'id'>) => Result;

  addInspectionReport: (d: Omit<InspectionReport, 'id'>) => Result;
  updateInspectionReport: (id: string, d: Partial<InspectionReport>) => Result;
  reviewInspectionReport: (id: string, level: 'L1' | 'QM', action: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED', comment: string, reviewer: string) => Result;

  addInspectorTask: (d: Omit<InspectorTask, 'id'>) => Result;
  updateInspectorTask: (id: string, d: Partial<InspectorTask>) => Result;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const newAudit = (action: AuditLogEntry['action'], entityType: string, entityName: string): AuditLogEntry => ({
  id: `A-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  action, entityType, entityName,
  userName: mock.currentUser.name,
  timestamp: new Date().toISOString(),
});

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [organization, setOrganization] = useState<Organization>(mock.initialOrganization);
  const [departments, setDepartments] = useState<Department[]>(mock.initialDepartments);
  const [users, setUsers] = useState<User[]>(mock.initialUsers);
  const [roles, setRoles] = useState<Role[]>(mock.initialRoles);
  const [products, setProducts] = useState<Product[]>(mock.initialProducts);
  const [components, setComponents] = useState<ProductComponent[]>(mock.initialComponents);
  const [manufacturingStages, setManufacturingStages] = useState<ManufacturingStage[]>(mock.initialManufacturingStages);
  const [assemblingStages, setAssemblingStages] = useState<AssemblingStage[]>(mock.initialAssemblingStages);
  const [inspectionTypes, setInspectionTypes] = useState<InspectionType[]>(mock.initialInspectionTypes);
  const [equipment, setEquipment] = useState<InspectionEquipment[]>(mock.initialEquipment);
  const [inspectionMethods, setInspectionMethods] = useState<InspectionMethod[]>(mock.initialInspectionMethods);
  const [documents, setDocuments] = useState<MfgDocument[]>(mock.initialDocuments);
  const [materials, setMaterials] = useState<Material[]>(mock.initialMaterials);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>(mock.initialMaterialTypes);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mock.initialSuppliers);
  const [evalMethods, setEvalMethods] = useState<SupplierEvalMethod[]>(mock.initialEvalMethods);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(mock.initialAuditLog);
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>(inspect.initialInspectionRecords);
  const [inspectionPlans, setInspectionPlans] = useState<InspectionPlan[]>(inspect.initialInspectionPlans);
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignment[]>(inspect.initialResourceAssignments);
  const [supplierEvaluations, setSupplierEvaluations] = useState<SupplierEvaluation[]>(inspect.initialSupplierEvaluations);
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>(moduleData.initialProductionPlans);
  const [materialPlans, setMaterialPlans] = useState<MaterialReceivedPlan[]>(moduleData.initialMaterialPlans);
  const [approvedVendors, setApprovedVendors] = useState<ApprovedVendor[]>(moduleData.initialApprovedVendors);
  const [stockStatements, setStockStatements] = useState<MaterialStockStatement[]>(moduleData.initialStockStatements);
  const [qualityPlans, setQualityPlans] = useState<ProductQualityPlan[]>(moduleData.initialQualityPlans);
  const [inspectorAssignments, setInspectorAssignments] = useState<InspectorAssignment[]>(moduleData.initialInspectorAssignments);
  const [checklists, setChecklists] = useState<InspectionChecklist[]>(moduleData.initialChecklists);
  const [calibrationApprovals, setCalibrationApprovals] = useState<CalibrationApproval[]>(moduleData.initialCalibrationApprovals);
  const [inspectionReports, setInspectionReports] = useState<InspectionReport[]>(moduleData.initialInspectionReports);
  const [inspectorTasks, setInspectorTasks] = useState<InspectorTask[]>(moduleData.initialInspectorTasks);

  const pushAudit = useCallback((entry: AuditLogEntry) => setAuditLog((p) => [entry, ...p]), []);

  // Organization
  const updateOrganization = (data: Partial<Organization>) => {
    setOrganization((o) => ({ ...o, ...data }));
    pushAudit(newAudit('Updated', 'Organization', data.name || organization.name));
  };

  // Departments
  const addDepartment: DataContextType['addDepartment'] = (data) => {
    if (departments.some((d) => d.name.toLowerCase() === data.name.toLowerCase()))
      return { success: false, error: 'Department name already exists' };
    const newDept = { ...data, id: nextId('DEPT', departments), createdAt: new Date().toISOString() };
    setDepartments((p) => [...p, newDept]);
    pushAudit(newAudit('Created', 'Department', newDept.name));
    return { success: true };
  };
  const updateDepartment: DataContextType['updateDepartment'] = (id, data) => {
    if (data.name && departments.some((d) => d.id !== id && d.name.toLowerCase() === data.name!.toLowerCase()))
      return { success: false, error: 'Department name already exists' };
    let name = '';
    setDepartments((p) => p.map((d) => { if (d.id === id) { name = data.name || d.name; return { ...d, ...data }; } return d; }));
    pushAudit(newAudit('Updated', 'Department', name));
    return { success: true };
  };
  const deleteDepartment: DataContextType['deleteDepartment'] = (id) => {
    const linked = users.filter((u) => u.departmentId === id).length;
    if (linked > 0) return { success: false, error: `Cannot delete: ${linked} user${linked > 1 ? 's' : ''} assigned` };
    const d = departments.find((x) => x.id === id);
    setDepartments((p) => p.filter((x) => x.id !== id));
    if (d) pushAudit(newAudit('Deleted', 'Department', d.name));
    return { success: true };
  };

  // Users
  const addUser: DataContextType['addUser'] = (data) => {
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) return { success: false, error: 'Email already exists' };
    if (users.some((u) => u.employeeId === data.employeeId)) return { success: false, error: 'Employee ID already exists' };
    const u: User = { ...data, id: nextId('U', users), createdAt: new Date().toISOString() };
    setUsers((p) => [...p, u]);
    pushAudit(newAudit('Created', 'User', u.name));
    return { success: true };
  };
  const updateUser: DataContextType['updateUser'] = (id, data) => {
    if (data.email && users.some((u) => u.id !== id && u.email.toLowerCase() === data.email!.toLowerCase())) return { success: false, error: 'Email already exists' };
    let name = '';
    setUsers((p) => p.map((u) => { if (u.id === id) { name = data.name || u.name; return { ...u, ...data }; } return u; }));
    pushAudit(newAudit('Updated', 'User', name));
    return { success: true };
  };
  const deleteUser: DataContextType['deleteUser'] = (id) => {
    const u = users.find((x) => x.id === id);
    setUsers((p) => p.filter((x) => x.id !== id));
    if (u) pushAudit(newAudit('Deleted', 'User', u.name));
    return { success: true };
  };
  const bulkUpdateUserStatus = (ids: string[], status: 'Active' | 'Inactive') => {
    setUsers((p) => p.map((u) => (ids.includes(u.id) ? { ...u, status } : u)));
    pushAudit(newAudit('Updated', 'User', `${ids.length} users → ${status}`));
  };

  // Roles
  const addRole: DataContextType['addRole'] = (data) => {
    if (roles.some((r) => r.name.toLowerCase() === data.name.toLowerCase())) return { success: false, error: 'Role name already exists' };
    const r: Role = { ...data, id: nextId('ROLE', roles) };
    setRoles((p) => [...p, r]);
    pushAudit(newAudit('Created', 'Role', r.name));
    return { success: true };
  };
  const updateRole: DataContextType['updateRole'] = (id, data) => {
    let name = '';
    setRoles((p) => p.map((r) => { if (r.id === id) { name = data.name || r.name; return { ...r, ...data }; } return r; }));
    pushAudit(newAudit('Updated', 'Role', name));
    return { success: true };
  };
  const deleteRole: DataContextType['deleteRole'] = (id) => {
    const r = roles.find((x) => x.id === id);
    if (!r) return { success: false, error: 'Not found' };
    if (r.isSystem) return { success: false, error: 'Cannot delete system role' };
    const linked = users.filter((u) => u.roleId === id).length;
    if (linked > 0) return { success: false, error: `Cannot delete: ${linked} users assigned` };
    setRoles((p) => p.filter((x) => x.id !== id));
    pushAudit(newAudit('Deleted', 'Role', r.name));
    return { success: true };
  };

  // Products
  const addProduct: DataContextType['addProduct'] = (data) => {
    if (products.some((p) => p.code.toLowerCase() === data.code.toLowerCase())) return { success: false, error: 'Product code already exists' };
    const np: Product = { ...data, id: nextId('PROD', products), createdAt: new Date().toISOString() };
    setProducts((p) => [...p, np]);
    pushAudit(newAudit('Created', 'Product', np.name));
    return { success: true };
  };
  const updateProduct: DataContextType['updateProduct'] = (id, data) => {
    let name = '';
    setProducts((p) => p.map((x) => { if (x.id === id) { name = data.name || x.name; return { ...x, ...data, updatedAt: new Date().toISOString() }; } return x; }));
    pushAudit(newAudit('Updated', 'Product', name));
    return { success: true };
  };
  const deleteProduct: DataContextType['deleteProduct'] = (id) => {
    const linked = components.filter((c) => c.productId === id).length;
    if (linked > 0) return { success: false, error: `Cannot delete: ${linked} components linked` };
    const p = products.find((x) => x.id === id);
    setProducts((pr) => pr.filter((x) => x.id !== id));
    if (p) pushAudit(newAudit('Deleted', 'Product', p.name));
    return { success: true };
  };

  // Components
  const addComponent: DataContextType['addComponent'] = (data) => {
    const nc: ProductComponent = { ...data, id: nextId('COMP', components), createdAt: new Date().toISOString() };
    setComponents((p) => [...p, nc]);
    pushAudit(newAudit('Created', 'Component', nc.name));
    return { success: true };
  };
  const updateComponent: DataContextType['updateComponent'] = (id, data) => {
    let name = '';
    setComponents((p) => p.map((c) => { if (c.id === id) { name = data.name || c.name; return { ...c, ...data, updatedAt: new Date().toISOString() }; } return c; }));
    pushAudit(newAudit('Updated', 'Component', name));
    return { success: true };
  };
  const deleteComponent: DataContextType['deleteComponent'] = (id) => {
    const c = components.find((x) => x.id === id);
    setComponents((p) => p.filter((x) => x.id !== id));
    if (c) pushAudit(newAudit('Deleted', 'Component', c.name));
    return { success: true };
  };

  // Manufacturing Stages
  const addManufacturingStage: DataContextType['addManufacturingStage'] = (data) => {
    if (manufacturingStages.some((s) => s.name.toLowerCase() === data.name.toLowerCase())) return { success: false, error: 'Stage name already exists' };
    const now = new Date().toISOString();
    const s: ManufacturingStage = { status: 'ACTIVE', ...data, id: nextId('MFG', manufacturingStages), name: data.name, order: manufacturingStages.length + 1, createdAt: now, updatedAt: now };
    setManufacturingStages((p) => [...p, s]);
    pushAudit(newAudit('Created', 'Manufacturing Stage', s.name));
    return { success: true };
  };
  const updateManufacturingStage: DataContextType['updateManufacturingStage'] = (id, data) => {
    let name = '';
    setManufacturingStages((p) => p.map((s) => { if (s.id === id) { name = data.name || s.name; return { ...s, ...data, updatedAt: new Date().toISOString() }; } return s; }));
    pushAudit(newAudit('Updated', 'Manufacturing Stage', name));
    return { success: true };
  };
  const deleteManufacturingStage: DataContextType['deleteManufacturingStage'] = (id) => {
    const linked = products.filter((p) => p.manufacturingStageIds.includes(id)).length;
    if (linked > 0) return { success: false, error: `Cannot delete: ${linked} products linked` };
    const s = manufacturingStages.find((x) => x.id === id);
    setManufacturingStages((p) => p.filter((x) => x.id !== id).map((x, i) => ({ ...x, order: i + 1 })));
    if (s) pushAudit(newAudit('Deleted', 'Manufacturing Stage', s.name));
    return { success: true };
  };
  const reorderManufacturingStages = (ids: string[]) => {
    setManufacturingStages((p) => {
      const map = new Map(p.map((s) => [s.id, s]));
      return ids.map((id, i) => ({ ...map.get(id)!, order: i + 1 }));
    });
  };

  // Assembling Stages
  const addAssemblingStage: DataContextType['addAssemblingStage'] = (data) => {
    if (assemblingStages.some((s) => s.name.toLowerCase() === data.name.toLowerCase())) return { success: false, error: 'Stage name already exists' };
    const now = new Date().toISOString();
    const s: AssemblingStage = { status: 'ACTIVE', ...data, id: nextId('ASM', assemblingStages), name: data.name, order: assemblingStages.length + 1, createdAt: now, updatedAt: now };
    setAssemblingStages((p) => [...p, s]);
    pushAudit(newAudit('Created', 'Assembling Stage', s.name));
    return { success: true };
  };
  const updateAssemblingStage: DataContextType['updateAssemblingStage'] = (id, data) => {
    let name = '';
    setAssemblingStages((p) => p.map((s) => { if (s.id === id) { name = data.name || s.name; return { ...s, ...data, updatedAt: new Date().toISOString() }; } return s; }));
    pushAudit(newAudit('Updated', 'Assembling Stage', name));
    return { success: true };
  };
  const deleteAssemblingStage: DataContextType['deleteAssemblingStage'] = (id) => {
    const linked = products.filter((p) => p.assemblingStageIds.includes(id)).length;
    if (linked > 0) return { success: false, error: `Cannot delete: ${linked} products linked` };
    const s = assemblingStages.find((x) => x.id === id);
    setAssemblingStages((p) => p.filter((x) => x.id !== id).map((x, i) => ({ ...x, order: i + 1 })));
    if (s) pushAudit(newAudit('Deleted', 'Assembling Stage', s.name));
    return { success: true };
  };
  const reorderAssemblingStages = (ids: string[]) => {
    setAssemblingStages((p) => {
      const map = new Map(p.map((s) => [s.id, s]));
      return ids.map((id, i) => ({ ...map.get(id)!, order: i + 1 }));
    });
  };

  // Inspection Types
  const addInspectionType: DataContextType['addInspectionType'] = (data) => {
    if (inspectionTypes.some((t) => t.name.toLowerCase() === data.name.toLowerCase())) return { success: false, error: 'Already exists' };
    const t: InspectionType = { id: nextId('INSP', inspectionTypes), name: data.name };
    setInspectionTypes((p) => [...p, t]);
    pushAudit(newAudit('Created', 'Inspection Type', t.name));
    return { success: true };
  };
  const updateInspectionType: DataContextType['updateInspectionType'] = (id, data) => {
    let name = '';
    setInspectionTypes((p) => p.map((t) => { if (t.id === id) { name = data.name || t.name; return { ...t, ...data }; } return t; }));
    pushAudit(newAudit('Updated', 'Inspection Type', name));
    return { success: true };
  };
  const deleteInspectionType: DataContextType['deleteInspectionType'] = (id) => {
    const t = inspectionTypes.find((x) => x.id === id);
    setInspectionTypes((p) => p.filter((x) => x.id !== id));
    if (t) pushAudit(newAudit('Deleted', 'Inspection Type', t.name));
    return { success: true };
  };

  // Equipment
  const addEquipment: DataContextType['addEquipment'] = (data) => {
    if (equipment.some((e) => e.code.toLowerCase() === data.code.toLowerCase())) return { success: false, error: 'Equipment code already exists' };
    const e: InspectionEquipment = { ...data, id: nextId('EQP', equipment) };
    setEquipment((p) => [...p, e]);
    pushAudit(newAudit('Created', 'Equipment', e.name));
    return { success: true };
  };
  const updateEquipment: DataContextType['updateEquipment'] = (id, data) => {
    let name = '';
    setEquipment((p) => p.map((e) => { if (e.id === id) { name = data.name || e.name; return { ...e, ...data }; } return e; }));
    pushAudit(newAudit('Updated', 'Equipment', name));
    return { success: true };
  };
  const deleteEquipment: DataContextType['deleteEquipment'] = (id) => {
    const e = equipment.find((x) => x.id === id);
    setEquipment((p) => p.filter((x) => x.id !== id));
    if (e) pushAudit(newAudit('Deleted', 'Equipment', e.name));
    return { success: true };
  };

  // Inspection Methods
  const addInspectionMethod: DataContextType['addInspectionMethod'] = (data) => {
    if (inspectionMethods.some((m) => m.name.toLowerCase() === data.name.toLowerCase())) return { success: false, error: 'Already exists' };
    const m: InspectionMethod = { ...data, id: nextId('METH', inspectionMethods), isSystem: false };
    setInspectionMethods((p) => [...p, m]);
    pushAudit(newAudit('Created', 'Inspection Method', m.name));
    return { success: true };
  };
  const updateInspectionMethod: DataContextType['updateInspectionMethod'] = (id, data) => {
    let name = '';
    setInspectionMethods((p) => p.map((m) => { if (m.id === id) { name = data.name || m.name; return { ...m, ...data }; } return m; }));
    pushAudit(newAudit('Updated', 'Inspection Method', name));
    return { success: true };
  };
  const deleteInspectionMethod: DataContextType['deleteInspectionMethod'] = (id) => {
    const m = inspectionMethods.find((x) => x.id === id);
    if (!m) return { success: false, error: 'Not found' };
    if (m.isSystem) return { success: false, error: 'Cannot delete system method' };
    setInspectionMethods((p) => p.filter((x) => x.id !== id));
    pushAudit(newAudit('Deleted', 'Inspection Method', m.name));
    return { success: true };
  };

  // Documents
  const addDocument: DataContextType['addDocument'] = (data) => {
    const d: MfgDocument = { ...data, id: nextId('DOC', documents) };
    setDocuments((p) => [...p, d]);
    pushAudit(newAudit('Created', 'Document', d.name));
    return { success: true };
  };
  const updateDocument: DataContextType['updateDocument'] = (id, data) => {
    let name = '';
    setDocuments((p) => p.map((d) => { if (d.id === id) { name = data.name || d.name; return { ...d, ...data }; } return d; }));
    pushAudit(newAudit('Updated', 'Document', name));
    return { success: true };
  };
  const deleteDocument: DataContextType['deleteDocument'] = (id) => {
    const d = documents.find((x) => x.id === id);
    setDocuments((p) => p.filter((x) => x.id !== id));
    if (d) pushAudit(newAudit('Deleted', 'Document', d.name));
    return { success: true };
  };

  // Materials
  const addMaterial: DataContextType['addMaterial'] = (data) => {
    if (materials.some((m) => m.code.toLowerCase() === data.code.toLowerCase())) return { success: false, error: 'Code already exists' };
    const m: Material = { ...data, id: nextId('MAT', materials) };
    setMaterials((p) => [...p, m]);
    pushAudit(newAudit('Created', 'Material', m.name));
    return { success: true };
  };
  const updateMaterial: DataContextType['updateMaterial'] = (id, data) => {
    let name = '';
    setMaterials((p) => p.map((m) => { if (m.id === id) { name = data.name || m.name; return { ...m, ...data }; } return m; }));
    pushAudit(newAudit('Updated', 'Material', name));
    return { success: true };
  };
  const deleteMaterial: DataContextType['deleteMaterial'] = (id) => {
    const linked = suppliers.filter((s) => s.materialIds.includes(id)).length;
    if (linked > 0) return { success: false, error: `Cannot delete: ${linked} suppliers linked` };
    const m = materials.find((x) => x.id === id);
    setMaterials((p) => p.filter((x) => x.id !== id));
    if (m) pushAudit(newAudit('Deleted', 'Material', m.name));
    return { success: true };
  };

  // Material Types
  const addMaterialType: DataContextType['addMaterialType'] = (data) => {
    if (materialTypes.some((t) => t.name.toLowerCase() === data.name.toLowerCase())) return { success: false, error: 'Already exists' };
    const t: MaterialType = { id: nextId('MTYP', materialTypes), name: data.name };
    setMaterialTypes((p) => [...p, t]);
    pushAudit(newAudit('Created', 'Material Type', t.name));
    return { success: true };
  };
  const updateMaterialType: DataContextType['updateMaterialType'] = (id, data) => {
    let name = '';
    setMaterialTypes((p) => p.map((t) => { if (t.id === id) { name = data.name || t.name; return { ...t, ...data }; } return t; }));
    pushAudit(newAudit('Updated', 'Material Type', name));
    return { success: true };
  };
  const deleteMaterialType: DataContextType['deleteMaterialType'] = (id) => {
    const linked = materials.filter((m) => m.materialTypeId === id).length;
    if (linked > 0) return { success: false, error: `Cannot delete: ${linked} materials linked` };
    const t = materialTypes.find((x) => x.id === id);
    setMaterialTypes((p) => p.filter((x) => x.id !== id));
    if (t) pushAudit(newAudit('Deleted', 'Material Type', t.name));
    return { success: true };
  };

  // Suppliers
  const addSupplier: DataContextType['addSupplier'] = (data) => {
    if (suppliers.some((s) => s.name.toLowerCase() === data.name.toLowerCase())) return { success: false, error: 'Supplier name already exists' };
    const now = new Date().toISOString();
    const s: Supplier = { ...data, id: nextId('SUP', suppliers), createdAt: now, updatedAt: now };
    setSuppliers((p) => [...p, s]);
    pushAudit(newAudit('Created', 'Supplier', s.name));
    return { success: true };
  };
  const updateSupplier: DataContextType['updateSupplier'] = (id, data) => {
    let name = '';
    setSuppliers((p) => p.map((s) => { if (s.id === id) { name = data.name || s.name; return { ...s, ...data, updatedAt: new Date().toISOString() }; } return s; }));
    pushAudit(newAudit('Updated', 'Supplier', name));
    return { success: true };
  };
  const deleteSupplier: DataContextType['deleteSupplier'] = (id) => {
    const s = suppliers.find((x) => x.id === id);
    setSuppliers((p) => p.filter((x) => x.id !== id));
    if (s) pushAudit(newAudit('Deleted', 'Supplier', s.name));
    return { success: true };
  };

  // Eval Methods
  const addEvalMethod: DataContextType['addEvalMethod'] = (data) => {
    if (evalMethods.some((m) => m.name.toLowerCase() === data.name.toLowerCase())) return { success: false, error: 'Already exists' };
    const m: SupplierEvalMethod = { ...data, id: nextId('EVAL', evalMethods), isSystem: false };
    setEvalMethods((p) => [...p, m]);
    pushAudit(newAudit('Created', 'Evaluation Method', m.name));
    return { success: true };
  };
  const updateEvalMethod: DataContextType['updateEvalMethod'] = (id, data) => {
    let name = '';
    setEvalMethods((p) => p.map((m) => { if (m.id === id) { name = data.name || m.name; return { ...m, ...data }; } return m; }));
    pushAudit(newAudit('Updated', 'Evaluation Method', name));
    return { success: true };
  };
  const deleteEvalMethod: DataContextType['deleteEvalMethod'] = (id) => {
    const m = evalMethods.find((x) => x.id === id);
    if (!m) return { success: false, error: 'Not found' };
    if (m.isSystem) return { success: false, error: 'Cannot delete system method' };
    setEvalMethods((p) => p.filter((x) => x.id !== id));
    pushAudit(newAudit('Deleted', 'Evaluation Method', m.name));
    return { success: true };
  };

  // ─── Inspection Records ───
  const addInspectionRecord: DataContextType['addInspectionRecord'] = (data) => {
    const r: InspectionRecord = { ...data, id: nextId('IR', inspectionRecords) };
    setInspectionRecords((p) => [r, ...p]);
    pushAudit(newAudit('Created', 'Inspection Record', r.parameterName));
    return { success: true };
  };
  const updateInspectionRecord: DataContextType['updateInspectionRecord'] = (id, data) => {
    setInspectionRecords((p) => p.map((r) => (r.id === id ? { ...r, ...data } : r)));
    return { success: true };
  };
  const reviewInspectionRecord: DataContextType['reviewInspectionRecord'] = (id, action, comment, reviewer) => {
    setInspectionRecords((p) => p.map((r) => r.id === id ? { ...r, reviewStatus: action, reviewedBy: reviewer, reviewedDate: new Date().toISOString(), reviewComment: comment } : r));
    pushAudit(newAudit('Updated', 'Review', `${action} ${id}`));
    return { success: true };
  };

  // ─── Inspection Plans ───
  const addInspectionPlan: DataContextType['addInspectionPlan'] = (data) => {
    const prefix = data.type === 'MANUFACTURING' ? 'MFG' : data.type === 'ASSEMBLING' ? 'ASM' : data.type === 'MATERIAL' ? 'MAT' : 'COMP';
    const code = `${prefix}-PLAN-${String(inspectionPlans.filter((p) => p.type === data.type).length + 1).padStart(3, '0')}`;
    const plan: InspectionPlan = { ...data, planCode: code, id: nextId('IP', inspectionPlans), createdAt: new Date().toISOString() };
    setInspectionPlans((p) => [plan, ...p]);
    pushAudit(newAudit('Created', 'Inspection Plan', code));
    return { success: true };
  };
  const updateInspectionPlan: DataContextType['updateInspectionPlan'] = (id, data) => {
    let code = '';
    setInspectionPlans((p) => p.map((x) => { if (x.id === id) { code = data.planCode || x.planCode; return { ...x, ...data }; } return x; }));
    pushAudit(newAudit('Updated', 'Inspection Plan', code));
    return { success: true };
  };
  const deleteInspectionPlan: DataContextType['deleteInspectionPlan'] = (id) => {
    const plan = inspectionPlans.find((x) => x.id === id);
    if (!plan) return { success: false, error: 'Not found' };
    if (plan.status !== 'DRAFT') return { success: false, error: 'Only DRAFT plans can be deleted' };
    setInspectionPlans((p) => p.filter((x) => x.id !== id));
    pushAudit(newAudit('Deleted', 'Inspection Plan', plan.planCode));
    return { success: true };
  };

  // ─── Resource Assignments ───
  const addResourceAssignment: DataContextType['addResourceAssignment'] = (data) => {
    const a: ResourceAssignment = { ...data, id: nextId('RA', resourceAssignments) };
    setResourceAssignments((p) => [a, ...p]);
    pushAudit(newAudit('Created', 'Resource Assignment', `${a.inspectorName} → ${a.stageName}`));
    return { success: true };
  };
  const updateResourceAssignment: DataContextType['updateResourceAssignment'] = (id, data) => {
    setResourceAssignments((p) => p.map((r) => (r.id === id ? { ...r, ...data } : r)));
    return { success: true };
  };

  // ─── Production Plans ───
  const addProductionPlan: DataContextType['addProductionPlan'] = (data) => {
    const code = `PRD-PLAN-${String(productionPlans.length + 1).padStart(3, '0')}`;
    const plan: ProductionPlan = { ...data, id: nextId('PP', productionPlans), planCode: code, createdAt: new Date().toISOString() };
    setProductionPlans((p) => [plan, ...p]);
    pushAudit(newAudit('Created', 'Production Plan', code));
    return { success: true };
  };
  const updateProductionPlan: DataContextType['updateProductionPlan'] = (id, data) => {
    let code = '';
    setProductionPlans((p) => p.map((x) => { if (x.id === id) { code = data.planCode || x.planCode; return { ...x, ...data }; } return x; }));
    pushAudit(newAudit('Updated', 'Production Plan', code));
    return { success: true };
  };
  const deleteProductionPlan: DataContextType['deleteProductionPlan'] = (id) => {
    const plan = productionPlans.find((x) => x.id === id);
    if (!plan) return { success: false, error: 'Not found' };
    if (plan.status !== 'DRAFT') return { success: false, error: 'Only DRAFT plans can be deleted' };
    setProductionPlans((p) => p.filter((x) => x.id !== id));
    pushAudit(newAudit('Deleted', 'Production Plan', plan.planCode));
    return { success: true };
  };

  // ─── Supplier Evaluations ───
  const addSupplierEvaluation: DataContextType['addSupplierEvaluation'] = (data) => {
    const e: SupplierEvaluation = { ...data, id: nextId('SE', supplierEvaluations) };
    setSupplierEvaluations((p) => [e, ...p]);
    pushAudit(newAudit('Created', 'Supplier Evaluation', e.supplierName));
    return { success: true };
  };
  const updateSupplierEvaluation: DataContextType['updateSupplierEvaluation'] = (id, data) => {
    setSupplierEvaluations((p) => p.map((s) => (s.id === id ? { ...s, ...data } : s)));
    return { success: true };
  };

  // ─── Material Plans ───
  const addMaterialPlan: DataContextType['addMaterialPlan'] = (d) => {
    const code = `MRI-PLAN-${String(materialPlans.length + 1).padStart(3, '0')}`;
    const plan: MaterialReceivedPlan = { ...d, id: nextId('MP', materialPlans), createdAt: new Date().toISOString(), planCode: code };
    setMaterialPlans((p) => [plan, ...p]);
    pushAudit(newAudit('Created', 'Material Plan', code));
    return { success: true };
  };
  const updateMaterialPlan: DataContextType['updateMaterialPlan'] = (id, d) => {
    setMaterialPlans((p) => p.map((x) => (x.id === id ? { ...x, ...d } : x)));
    return { success: true };
  };
  const deleteMaterialPlan: DataContextType['deleteMaterialPlan'] = (id) => {
    const p = materialPlans.find((x) => x.id === id);
    if (!p) return { success: false, error: 'Not found' };
    if (p.overallStatus !== 'DRAFT') return { success: false, error: 'Only DRAFT plans can be deleted' };
    setMaterialPlans((arr) => arr.filter((x) => x.id !== id));
    return { success: true };
  };
  const reviewMaterialPlan: DataContextType['reviewMaterialPlan'] = (id, action, comment, reviewer) => {
    setMaterialPlans((p) => p.map((x) => x.id === id ? {
      ...x, reviewStatus: action, reviewedBy: reviewer, reviewedDate: new Date().toISOString(), reviewComment: comment,
      overallStatus: action === 'APPROVED' ? 'APPROVED' : action === 'REJECTED' ? 'REJECTED' : x.overallStatus,
    } : x));
    return { success: true };
  };

  // ─── Approved Vendors ───
  const addApprovedVendor: DataContextType['addApprovedVendor'] = (d) => {
    const v: ApprovedVendor = { ...d, id: nextId('AV', approvedVendors) };
    setApprovedVendors((p) => [v, ...p]);
    pushAudit(newAudit('Created', 'Approved Vendor', v.supplierName));
    return { success: true };
  };
  const updateApprovedVendor: DataContextType['updateApprovedVendor'] = (id, d) => {
    setApprovedVendors((p) => p.map((v) => (v.id === id ? { ...v, ...d } : v)));
    return { success: true };
  };

  // ─── Stock Statements ───
  const addStockStatement: DataContextType['addStockStatement'] = (d) => {
    const s: MaterialStockStatement = { ...d, id: nextId('SS', stockStatements) };
    setStockStatements((p) => [s, ...p]);
    pushAudit(newAudit('Created', 'Stock Statement', s.materialName));
    return { success: true };
  };
  const updateStockStatement: DataContextType['updateStockStatement'] = (id, d) => {
    setStockStatements((p) => p.map((x) => (x.id === id ? { ...x, ...d } : x)));
    return { success: true };
  };
  const deleteStockStatement: DataContextType['deleteStockStatement'] = (id) => {
    setStockStatements((p) => p.filter((x) => x.id !== id));
    return { success: true };
  };

  // ─── Quality Plans ───
  const addQualityPlan: DataContextType['addQualityPlan'] = (d) => {
    const code = `PQP-${String(qualityPlans.length + 1).padStart(3, '0')}`;
    const plan: ProductQualityPlan = { ...d, id: nextId('PQP', qualityPlans), createdAt: new Date().toISOString(), planCode: code };
    setQualityPlans((p) => [plan, ...p]);
    pushAudit(newAudit('Created', 'Quality Plan', code));
    return { success: true };
  };
  const updateQualityPlan: DataContextType['updateQualityPlan'] = (id, d) => {
    setQualityPlans((p) => p.map((x) => (x.id === id ? { ...x, ...d } : x)));
    return { success: true };
  };
  const deleteQualityPlan: DataContextType['deleteQualityPlan'] = (id) => {
    setQualityPlans((p) => p.filter((x) => x.id !== id));
    return { success: true };
  };

  // ─── Inspector Assignments ───
  const addInspectorAssignment: DataContextType['addInspectorAssignment'] = (d) => {
    const a: InspectorAssignment = { ...d, id: nextId('IA', inspectorAssignments) };
    setInspectorAssignments((p) => [a, ...p]);
    return { success: true };
  };
  const updateInspectorAssignment: DataContextType['updateInspectorAssignment'] = (id, d) => {
    setInspectorAssignments((p) => p.map((x) => (x.id === id ? { ...x, ...d } : x)));
    return { success: true };
  };

  // ─── Checklists ───
  const addChecklist: DataContextType['addChecklist'] = (d) => {
    const prefix = d.type === 'MANUFACTURING' ? 'MFG' : d.type === 'ASSEMBLING' ? 'ASM' : 'FP';
    const code = `CHK-${prefix}-${String(checklists.filter((c) => c.type === d.type).length + 1).padStart(3, '0')}`;
    const c: InspectionChecklist = { ...d, id: nextId('CHK', checklists), createdAt: new Date().toISOString(), checklistCode: code };
    setChecklists((p) => [c, ...p]);
    pushAudit(newAudit('Created', 'Checklist', code));
    return { success: true };
  };
  const updateChecklist: DataContextType['updateChecklist'] = (id, d) => {
    setChecklists((p) => p.map((x) => (x.id === id ? { ...x, ...d } : x)));
    return { success: true };
  };
  const deleteChecklist: DataContextType['deleteChecklist'] = (id) => {
    setChecklists((p) => p.filter((x) => x.id !== id));
    return { success: true };
  };

  // ─── Calibration Approvals ───
  const approveCalibration: DataContextType['approveCalibration'] = (id, approver) => {
    setCalibrationApprovals((p) => p.map((c) => c.id === id ? { ...c, approvalStatus: 'APPROVED', approvedBy: approver, approvedDate: new Date().toISOString() } : c));
    // Update equipment calibration status
    const cal = calibrationApprovals.find((c) => c.id === id);
    if (cal) {
      setEquipment((p) => p.map((eq) => eq.id === cal.equipmentId ? { ...eq, calibrationStatus: 'COMPLETED', calibrationDueDate: cal.nextDueDate } : eq));
    }
    return { success: true };
  };
  const rejectCalibration: DataContextType['rejectCalibration'] = (id, comment, approver) => {
    setCalibrationApprovals((p) => p.map((c) => c.id === id ? { ...c, approvalStatus: 'REJECTED', approvedBy: approver, approvedDate: new Date().toISOString(), rejectionComment: comment } : c));
    return { success: true };
  };
  const addCalibrationApproval: DataContextType['addCalibrationApproval'] = (d) => {
    const c: CalibrationApproval = { ...d, id: nextId('CA', calibrationApprovals) };
    setCalibrationApprovals((p) => [c, ...p]);
    return { success: true };
  };

  // ─── Inspection Reports ───
  const addInspectionReport: DataContextType['addInspectionReport'] = (d) => {
    const r: InspectionReport = { ...d, id: nextId('IR', inspectionReports) };
    setInspectionReports((p) => [r, ...p]);
    return { success: true };
  };
  const updateInspectionReport: DataContextType['updateInspectionReport'] = (id, d) => {
    setInspectionReports((p) => p.map((x) => (x.id === id ? { ...x, ...d } : x)));
    return { success: true };
  };
  const reviewInspectionReport: DataContextType['reviewInspectionReport'] = (id, level, action, comment, reviewer) => {
    setInspectionReports((p) => p.map((r) => {
      if (r.id !== id) return r;
      if (level === 'L1') {
        return {
          ...r, l1ReviewerName: reviewer, l1ReviewDate: new Date().toISOString(), l1Comment: comment,
          reportStatus: action === 'APPROVED' ? 'L1_APPROVED' : action === 'REJECTED' ? 'REJECTED' : 'INFO_REQUESTED',
        };
      }
      return {
        ...r, qmReviewerName: reviewer, qmReviewDate: new Date().toISOString(), qmComment: comment,
        reportStatus: action === 'APPROVED' ? 'FINAL_APPROVED' : action === 'REJECTED' ? 'REJECTED' : 'INFO_REQUESTED',
      };
    }));
    return { success: true };
  };

  // ─── Inspector Tasks ───
  const addInspectorTask: DataContextType['addInspectorTask'] = (d) => {
    const t: InspectorTask = { ...d, id: nextId('IT', inspectorTasks) };
    setInspectorTasks((p) => [t, ...p]);
    return { success: true };
  };
  const updateInspectorTask: DataContextType['updateInspectorTask'] = (id, d) => {
    setInspectorTasks((p) => p.map((x) => (x.id === id ? { ...x, ...d } : x)));
    return { success: true };
  };

  const value: DataContextType = {
    organization, departments, users, roles, products, components,
    manufacturingStages, assemblingStages, inspectionTypes, equipment,
    inspectionMethods, documents, materials, materialTypes, suppliers,
    evalMethods, auditLog,
    updateOrganization,
    addDepartment, updateDepartment, deleteDepartment,
    addUser, updateUser, deleteUser, bulkUpdateUserStatus,
    addRole, updateRole, deleteRole,
    addProduct, updateProduct, deleteProduct,
    addComponent, updateComponent, deleteComponent,
    addManufacturingStage, updateManufacturingStage, deleteManufacturingStage, reorderManufacturingStages,
    addAssemblingStage, updateAssemblingStage, deleteAssemblingStage, reorderAssemblingStages,
    addInspectionType, updateInspectionType, deleteInspectionType,
    addEquipment, updateEquipment, deleteEquipment,
    addInspectionMethod, updateInspectionMethod, deleteInspectionMethod,
    addDocument, updateDocument, deleteDocument,
    addMaterial, updateMaterial, deleteMaterial,
    addMaterialType, updateMaterialType, deleteMaterialType,
    addSupplier, updateSupplier, deleteSupplier,
    addEvalMethod, updateEvalMethod, deleteEvalMethod,
    inspectionRecords, inspectionPlans, resourceAssignments, supplierEvaluations, productionPlans,
    addInspectionRecord, updateInspectionRecord, reviewInspectionRecord,
    addInspectionPlan, updateInspectionPlan, deleteInspectionPlan,
    addResourceAssignment, updateResourceAssignment,
    addProductionPlan, updateProductionPlan, deleteProductionPlan,
    addSupplierEvaluation, updateSupplierEvaluation,
    materialPlans, approvedVendors, stockStatements, qualityPlans, inspectorAssignments,
    checklists, calibrationApprovals, inspectionReports, inspectorTasks,
    addMaterialPlan, updateMaterialPlan, deleteMaterialPlan, reviewMaterialPlan,
    addApprovedVendor, updateApprovedVendor,
    addStockStatement, updateStockStatement, deleteStockStatement,
    addQualityPlan, updateQualityPlan, deleteQualityPlan,
    addInspectorAssignment, updateInspectorAssignment,
    addChecklist, updateChecklist, deleteChecklist,
    approveCalibration, rejectCalibration, addCalibrationApproval,
    addInspectionReport, updateInspectionReport, reviewInspectionReport,
    addInspectorTask, updateInspectorTask,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
