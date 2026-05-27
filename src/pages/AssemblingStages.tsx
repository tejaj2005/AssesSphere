import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DraggableStageList } from '@/components/shared/DraggableStageList';
import { useData } from '@/context/DataContext';

export const AssemblingStagesPage = () => {
  const { assemblingStages, products, addAssemblingStage, updateAssemblingStage, deleteAssemblingStage, reorderAssemblingStages } = useData();
  return (
    <PageWrapper>
      <PageHeader title="Assembling Stages" description="Define and order assembly process stages. Drag to reorder." />
      <DraggableStageList
        entityLabel="Assembling Stage"
        stages={assemblingStages}
        countFn={(id) => products.filter((p) => p.assemblingStageIds.includes(id)).length}
        countLabel="products"
        onAdd={addAssemblingStage}
        onUpdate={updateAssemblingStage}
        onDelete={deleteAssemblingStage}
        onReorder={reorderAssemblingStages}
      />
    </PageWrapper>
  );
};
