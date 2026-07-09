import { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DraggableStageList } from '@/components/shared/DraggableStageList';
import { useApiResource } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { ProcessStage } from '@/types';

export const ManufacturingStagesPage = () => {
  const { user } = useAuth();
  const { items, create, update, remove, refetch } = useApiResource<any>('/admin/manufacturing-stages');
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    api.getList<any>('/admin/products').then(({ data }) => setProducts(data)).catch(() => setProducts([]));
  }, []);

  // Backend field is `sequence`; DraggableStageList/ProcessStage expects `order`.
  const stages: ProcessStage[] = items.map((s) => ({ ...s, order: s.sequence ?? 0 }));

  const countFn = (id: string) =>
    products.filter((p) => (p.manufacturingStages || []).some((ms: any) => (typeof ms === 'string' ? ms : ms?._id) === id)).length;

  const handleAdd = async (data: any) => {
    try {
      await create({ ...data, organization: user?.organization, sequence: stages.length + 1 });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to add stage' };
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await update(id, data);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update stage' };
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to delete stage' };
    }
  };

  const handleReorder = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id, index) => update(id, { sequence: index + 1 })));
      await refetch();
    } catch {
      // best-effort; refetch will reflect whatever persisted
      await refetch();
    }
  };

  return (
    <PageWrapper>
      <PageHeader title="Manufacturing Stages" description="Define and order manufacturing process stages. Drag to reorder." />
      <DraggableStageList
        entityLabel="Manufacturing Stage"
        stages={stages}
        countFn={countFn}
        countLabel="products"
        onAdd={handleAdd as any}
        onUpdate={handleUpdate as any}
        onDelete={handleDelete as any}
        onReorder={handleReorder}
      />
    </PageWrapper>
  );
};
