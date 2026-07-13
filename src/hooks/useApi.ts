import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

interface WithMongoId {
  _id: string;
  [key: string]: any;
}

/** Every existing page/shared component (DataTable, FormDrawer, DraggableStageList, ...)
 * keys entities by `.id`, matching the old mock data shape. The backend returns Mongo `_id`.
 * Rather than touch every `.id` reference across the app, normalize once here: every item
 * gets `id` mirrored from `_id` so old UI code keeps working unchanged. */
export type WithClientId<T> = T & { id: string };

function withClientId<T extends WithMongoId>(raw: T): WithClientId<T> {
  return { ...raw, id: raw._id };
}

/**
 * Generic CRUD hook for a REST resource. Keeps a local mirror of the list so
 * every mutation updates the UI immediately without a full refetch.
 *
 * @param pollMs optional — when set, silently re-fetches in the background on this interval
 * so changes made by another role/tab (e.g. an Admin creating a user) show up on an
 * already-open page without the viewer having to navigate away and back. The poll never
 * shows a loading state and only re-renders if the data actually changed, so it can't
 * interrupt something the user is mid-edit on. A backgrounded browser tab throttles its own
 * timers, so this also naturally goes quiet when the page isn't in view.
 */
export function useApiResource<T extends WithMongoId>(basePath: string, query?: Record<string, string>, pollMs?: number) {
  const [items, setItems] = useState<WithClientId<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryKey = query ? JSON.stringify(query) : '';

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
      const { data } = await api.getList<T>(`${basePath}${qs}`);
      const normalized = data.map(withClientId);
      setItems(normalized);
      return normalized;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      return [];
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, queryKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(async () => {
      try {
        const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        const { data } = await api.getList<T>(`${basePath}${qs}`);
        const normalized = data.map(withClientId);
        setItems((prev) => (JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized));
      } catch {
        // a background poll failing silently isn't worth surfacing as a page-level error
      }
    }, pollMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, queryKey, pollMs]);

  const create = useCallback(async (payload: Partial<T>): Promise<WithClientId<T>> => {
    const created = withClientId(await api.post<T>(basePath, payload));
    setItems((prev) => [...prev, created]);
    return created;
  }, [basePath]);

  const update = useCallback(async (id: string, payload: Partial<T>): Promise<WithClientId<T>> => {
    const updated = withClientId(await api.put<T>(`${basePath}/${id}`, payload));
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    return updated;
  }, [basePath]);

  const remove = useCallback(async (id: string): Promise<void> => {
    await api.delete(`${basePath}/${id}`);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, [basePath]);

  return { items, setItems, loading, error, refetch, create, update, remove };
}

/** For single-record fetches, e.g. GET /admin/products/:id. */
export function useApiItem<T extends WithMongoId>(path: string | null) {
  const [item, setItem] = useState<WithClientId<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!path) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setItem(withClientId(await api.get<T>(path)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { item, setItem, loading, error, refetch };
}
