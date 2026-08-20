import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Pagination from './Pagination';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  /** The raw query error, if any - passed through to ErrorState so it can
   * tell an access-denied (401/403) response apart from a real failure. */
  error?: unknown;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
}

export default function DataTable<T>({
  columns,
  data,
  isLoading,
  isError,
  error,
  pagination,
  onPageChange,
  onSort,
  onRowClick,
  emptyMessage = 'No data found',
  rowKey,
  rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    const nextDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(nextDir);
    onSort?.(key, nextDir);
  };

  return (
    <div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full rounded-lg overflow-hidden border border-mint-light">
          <thead>
            <tr className="bg-deep-cash/5">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className="px-4 py-3 text-left text-cash-green text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-deep-cash transition-colors"
                    >
                      {col.header}
                      <ArrowUpDown size={12} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-mint-light/50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="animate-pulse bg-mint-light/60 h-4 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={columns.length}>
                  <ErrorState error={error} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyMessage} />
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'bg-white hover:bg-soft-white transition-colors border-b border-mint-light/50',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-deep-cash">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.total > 0 && onPageChange && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={onPageChange}
        />
      )}
    </div>
  );
}
