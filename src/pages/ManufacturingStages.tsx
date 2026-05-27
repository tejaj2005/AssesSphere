import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DraggableStageList } from '@/components/shared/DraggableStageList';
import { useData } from '@/context/DataContext';

export const ManufacturingStagesPage = () => {
  const { manufacturingStages, products, addManufacturingStage, updateManufacturingStage, deleteManufacturingStage, reorderManufacturingStages } = useData();
  return (
    <PageWrapper>
      <PageHeader title="Manufacturing Stages" description="Define and order manufacturing process stages. Drag to reorder." />
      <DraggableStageList
        entityLabel="Manufacturing Stage"
        stages={manufacturingStages}
        countFn={(id) => products.filter((p) => p.manufacturingStageIds.includes(id)).length}
        countLabel="products"
        onAdd={addManufacturingStage}
        onUpdate={updateManufacturingStage}
        onDelete={deleteManufacturingStage}
        onReorder={reorderManufacturingStages}
      />
    </PageWrapper>
  );
};
