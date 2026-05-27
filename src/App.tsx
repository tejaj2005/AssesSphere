import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRedirect } from '@/components/RoleRedirect';

import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Logout } from '@/pages/Logout';
import { NotFound } from '@/pages/NotFound';

// Admin
import { Dashboard } from '@/pages/Dashboard';
import { OrganizationPage } from '@/pages/Organization';
import { DepartmentsPage } from '@/pages/Departments';
import { UsersPage } from '@/pages/Users';
import { RolesPage } from '@/pages/Roles';
import { ProductsPage } from '@/pages/Products';
import { ProductDetailPage } from '@/pages/ProductDetail';
import { ComponentsPage } from '@/pages/Components';
import { ManufacturingStagesPage } from '@/pages/ManufacturingStages';
import { AssemblingStagesPage } from '@/pages/AssemblingStages';
import { InspectionTypesPage } from '@/pages/InspectionTypes';
import { EquipmentPage } from '@/pages/Equipment';
import { InspectionMethodsPage } from '@/pages/InspectionMethods';
import { DocumentsPage } from '@/pages/Documents';
import { MaterialsPage } from '@/pages/Materials';
import { MaterialTypesPage } from '@/pages/MaterialTypes';
import { SuppliersPage } from '@/pages/Suppliers';
import { ProfilePage } from '@/pages/Profile';
import { SettingsPage } from '@/pages/Settings';

// Management
import { MANAGEMENT_NAV } from '@/pages/management/ManagementNav';
import { ProductQualityDashboard } from '@/pages/management/ProductQualityDashboard';
import { ManufacturingQualityDashboard } from '@/pages/management/ManufacturingQualityDashboard';
import { AssemblingQualityDashboard } from '@/pages/management/AssemblingQualityDashboard';
import { MaterialQualityDashboard } from '@/pages/management/MaterialQualityDashboard';
import { SupplierEvalDashboard } from '@/pages/management/SupplierEvalDashboard';

// PM
import { PM_NAV } from '@/pages/production-manager/PMNav';
import { PMDashboard } from '@/pages/production-manager/PMDashboard';
import { MfgInspectionPlans } from '@/pages/production-manager/MfgInspectionPlans';
import { AsmInspectionPlans } from '@/pages/production-manager/AsmInspectionPlans';
import { MatInspectionPlans } from '@/pages/production-manager/MatInspectionPlans';
import { CompInspectionPlans } from '@/pages/production-manager/CompInspectionPlans';
import { ResourceAssignment } from '@/pages/production-manager/ResourceAssignment';
import { ReviewReports } from '@/pages/production-manager/ReviewReports';
import { QualityPlanReview } from '@/pages/production-manager/QualityPlanReview';

// SM
import { SM_NAV } from '@/pages/stores-manager/SMNav';
import { SMDashboard } from '@/pages/stores-manager/SMDashboard';
import { MaterialReceivedPlans } from '@/pages/stores-manager/MaterialReceivedPlans';
import { SupplierEvaluations } from '@/pages/stores-manager/SupplierEvaluations';
import { ApprovedVendors } from '@/pages/stores-manager/ApprovedVendors';
import { ReviewMaterialReports } from '@/pages/stores-manager/ReviewMaterialReports';
import { StockStatement } from '@/pages/stores-manager/StockStatement';
import { SMMaterialQualityDash, SMSupplierDash } from '@/pages/stores-manager/SMDashboards';

// QM
import { QM_NAV } from '@/pages/quality-manager/QMNav';
import { QMDashboard } from '@/pages/quality-manager/QMDashboard';
import { ProductQualityPlans } from '@/pages/quality-manager/ProductQualityPlans';
import { AssignInspectors } from '@/pages/quality-manager/AssignInspectors';
import { InspectionChecklists } from '@/pages/quality-manager/InspectionChecklists';
import { CalibrationApprovals } from '@/pages/quality-manager/CalibrationApprovals';
import { ReviewAllReports } from '@/pages/quality-manager/ReviewAllReports';
import { QMProductQualityDash, QMMfgQualityDash, QMAsmQualityDash, QMMaterialQualityDash, QMComponentQualityDash, QMSupplierDash } from '@/pages/quality-manager/QMDashboards';

// Inspector
import { INSPECTOR_NAV } from '@/pages/inspector/InspectorNav';
import { InspectorDashboard } from '@/pages/inspector/InspectorDashboard';
import { MaterialReports, ComponentReports, AssemblyReports, FinalProductReports } from '@/pages/inspector/InspectorReports';
import { CalibrationReport } from '@/pages/inspector/CalibrationReport';

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/app" element={<RoleRedirect />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="organization" element={<OrganizationPage />} />
                <Route path="departments" element={<DepartmentsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/:id" element={<ProductDetailPage />} />
                <Route path="components" element={<ComponentsPage />} />
                <Route path="manufacturing-stages" element={<ManufacturingStagesPage />} />
                <Route path="assembling-stages" element={<AssemblingStagesPage />} />
                <Route path="inspection-types" element={<InspectionTypesPage />} />
                <Route path="equipment" element={<EquipmentPage />} />
                <Route path="inspection-methods" element={<InspectionMethodsPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="materials" element={<MaterialsPage />} />
                <Route path="material-types" element={<MaterialTypesPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route path="/management" element={<ModuleLayout moduleName="Management" groups={MANAGEMENT_NAV} profileLink="/admin/profile" />}>
                <Route index element={<Navigate to="product-quality" replace />} />
                <Route path="product-quality" element={<ProductQualityDashboard />} />
                <Route path="manufacturing-quality" element={<ManufacturingQualityDashboard />} />
                <Route path="assembling-quality" element={<AssemblingQualityDashboard />} />
                <Route path="material-quality" element={<MaterialQualityDashboard />} />
                <Route path="supplier-evaluation" element={<SupplierEvalDashboard />} />
              </Route>

              <Route path="/pm" element={<ModuleLayout moduleName="Production Manager" groups={PM_NAV} profileLink="/admin/profile" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<PMDashboard />} />
                <Route path="mfg-plans" element={<MfgInspectionPlans />} />
                <Route path="asm-plans" element={<AsmInspectionPlans />} />
                <Route path="mat-plans" element={<MatInspectionPlans />} />
                <Route path="comp-plans" element={<CompInspectionPlans />} />
                <Route path="resources" element={<ResourceAssignment />} />
                <Route path="review-reports" element={<ReviewReports />} />
                <Route path="quality-plan-review" element={<QualityPlanReview />} />
              </Route>

              <Route path="/sm" element={<ModuleLayout moduleName="Stores Manager" groups={SM_NAV} profileLink="/admin/profile" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<SMDashboard />} />
                <Route path="material-plans" element={<MaterialReceivedPlans />} />
                <Route path="review-material-reports" element={<ReviewMaterialReports />} />
                <Route path="supplier-evaluations" element={<SupplierEvaluations />} />
                <Route path="approved-vendors" element={<ApprovedVendors />} />
                <Route path="stock-statement" element={<StockStatement />} />
                <Route path="material-quality" element={<SMMaterialQualityDash />} />
                <Route path="supplier-performance" element={<SMSupplierDash />} />
              </Route>

              <Route path="/qm" element={<ModuleLayout moduleName="Quality Manager" groups={QM_NAV} profileLink="/admin/profile" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<QMDashboard />} />
                <Route path="quality-plans" element={<ProductQualityPlans />} />
                <Route path="assign-inspectors" element={<AssignInspectors />} />
                <Route path="checklists" element={<InspectionChecklists />} />
                <Route path="calibration-approvals" element={<CalibrationApprovals />} />
                <Route path="review-reports" element={<ReviewAllReports />} />
                <Route path="product-quality" element={<QMProductQualityDash />} />
                <Route path="mfg-quality" element={<QMMfgQualityDash />} />
                <Route path="asm-quality" element={<QMAsmQualityDash />} />
                <Route path="material-quality" element={<QMMaterialQualityDash />} />
                <Route path="component-quality" element={<QMComponentQualityDash />} />
                <Route path="supplier-performance" element={<QMSupplierDash />} />
              </Route>

              <Route path="/inspector" element={<ModuleLayout moduleName="Inspector" groups={INSPECTOR_NAV} profileLink="/admin/profile" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<InspectorDashboard />} />
                <Route path="material-reports" element={<MaterialReports />} />
                <Route path="component-reports" element={<ComponentReports />} />
                <Route path="assembly-reports" element={<AssemblyReports />} />
                <Route path="final-product-reports" element={<FinalProductReports />} />
                <Route path="calibration-report" element={<CalibrationReport />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-right" toastOptions={{ classNames: { toast: 'rounded-lg !border !bg-card !text-card-foreground' } }} richColors closeButton />
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
