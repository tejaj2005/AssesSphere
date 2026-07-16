import { PlanListView } from '@/components/plans/PlanListView';

export const MatInspectionPlans = () => (
  <PlanListView type="MATERIAL" title="Material Inspection Plans" description="Plans for inspecting incoming materials from suppliers." extraFilters="material" />
);
