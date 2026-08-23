// src/components/data-display/DataTable.jsx
//
// New (docs/frontend/MIGRATION-PLAN.md Phase 5). Presentational only - takes
// columns + rows + the verified { items, total, page, limit } envelope
// (04-REPRESENTATIVE-DATA.md) and renders loading/refreshing/empty/
// no-result/error states, per 01-PRODUCT-UX-BRIEF.md §8's rule that these
// four states must not collapse into one generic "No Data" look. It does
// NOT define copy for any state itself (icon/title/description/action are
// all caller-supplied) - per §11's rule that primitives must not know
// business domains, DataTable has zero PM/Inventory/Line knowledge.
//
// Markup/tokens follow the exact pattern already established by hand-rolled
// tables in PmPartMonitoringPage.jsx / MasterDataPage.jsx (border-collapse,
// font-mono uppercase header, border-[var(--border-soft)] row dividers,
// hover:bg-secondary) so a future migration of those pages is a like-for-
// like swap, not a visual change.
//
// NOT YET WIRED INTO ANY PAGE - additive only, same approach as Phase 3's
// primitives. Acceptance criteria for this phase (per MIGRATION-PLAN.md) is
// verifying this renders the real envelope correctly in a non-production
// harness; wiring into Dashboard/PM Part happens in Phase 6/7.
import { AlertTriangle, Inbox, SearchX } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../ui/empty-state';
import Pagination from './Pagination';

function DataTable({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  isRefreshing = false,
  isError = false,
  errorState,
  emptyState,
  page,
  limit,
  total,
  onPageChange,
  skeletonRows = 5,
  className,
}) {
  const hasRows = Array.isArray(rows) && rows.length > 0;
  const showPagination = typeof total === 'number' && typeof limit === 'number' && onPageChange && (hasRows || total > 0);

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4.5', className)}>
      {isError ? (
        errorState || (
          <EmptyState
            icon={AlertTriangle}
            tone="danger"
            title="Data gagal dimuat"
            description="Terjadi kesalahan saat memuat data. Coba lagi."
          />
        )
      ) : isLoading ? (
        <DataTableSkeleton columns={columns} rows={skeletonRows} />
      ) : !hasRows ? (
        emptyState || <EmptyState icon={Inbox} title="Belum ada data" />
      ) : (
        <>
          <div
            className={cn(
              'overflow-hidden rounded-lg border border-border transition-opacity',
              isRefreshing && 'opacity-60'
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          'whitespace-nowrap px-3 py-2 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        )}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={getRowKey(row)}
                      className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary"
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            'px-3 py-3 text-[13px]',
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                            col.className
                          )}
                        >
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showPagination && <Pagination page={page} limit={limit} total={total} onPageChange={onPageChange} />}
        </>
      )}
    </div>
  );
}

function DataTableSkeleton({ columns, rows }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--border-soft)] last:border-b-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-3">
                    <Skeleton className="h-4 w-full max-w-32" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Exported so a page can compose its own "no result" copy distinctly from
// "empty" copy while still using DataTable's layout - e.g.
// <DataTable emptyState={<DataTableNoResult onReset={...} />} ... />
function DataTableNoResult({ description = 'Tidak ada record yang cocok dengan filter.', onReset }) {
  return (
    <EmptyState
      icon={SearchX}
      title="Tidak ada hasil"
      description={description}
      action={
        onReset && (
          <button
            type="button"
            onClick={onReset}
            className="cursor-pointer rounded-md border border-border bg-transparent px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
          >
            Reset Filter
          </button>
        )
      }
    />
  );
}

export { DataTable, DataTableNoResult };
export default DataTable;
