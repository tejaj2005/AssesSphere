import { ReactNode, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
  width?: string;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
}

export function DataTable<T extends { id: string }>({
  columns, data, pageSize = 10, loading, emptyTitle = 'No data', emptyDescription, emptyAction,
  selectable, selectedIds = [], onSelectionChange, onRowClick, rowClassName,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return data;
    return [...data].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);

  if (page > totalPages && totalPages >= 1) setPage(1);

  const toggleSort = (key: string) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: 'asc' };
      if (s.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const allSelected = pageData.length > 0 && pageData.every((r) => selectedIds.includes(r.id));
  const someSelected = pageData.some((r) => selectedIds.includes(r.id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const pageIds = pageData.map((r) => r.id);
    if (allSelected) onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)));
    else onSelectionChange(Array.from(new Set([...selectedIds, ...pageIds])));
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter((x) => x !== id));
    else onSelectionChange([...selectedIds, id]);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} className={cn(someSelected && 'bg-accent/40')} />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn('px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground', c.width, c.sortable && 'cursor-pointer select-none')}
                  onClick={() => c.sortable && toggleSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {c.sortable && (
                      sort?.key === c.key
                        ? sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        : <ChevronsUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>}
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
                  ))}
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                  <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors duration-150 hover:bg-secondary/60',
                    onRowClick && 'cursor-pointer',
                    selectedIds.includes(row.id) && 'bg-brand-50/50 dark:bg-brand-500/5',
                    rowClassName?.(row)
                  )}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleOne(row.id)} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 text-foreground', c.className)}>{c.cell(row, i)}</td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && pageData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span>-<span className="font-medium">{Math.min(page * pageSize, sorted.length)}</span> of <span className="font-medium">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
              const p = i + 1;
              return (
                <Button
                  key={p}
                  variant={page === p ? 'accent' : 'outline'}
                  size="icon-sm"
                  onClick={() => setPage(p)}
                  className="font-medium"
                >
                  {p}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="px-1 text-xs text-muted-foreground">…</span>}
            <Button variant="outline" size="icon-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
