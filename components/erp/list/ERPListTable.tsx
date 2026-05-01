'use client'

/**
 * ERPListTable — generic, typed desktop data table for ERP list pages.
 *
 * Features:
 *  - Column definitions with optional custom render, width, alignment
 *  - Click-to-navigate rows
 *  - Sortable columns (pass onSort + currentSort)
 *  - Empty state slot
 *  - Skeleton loading rows
 *  - Sticky header option
 *  - Mobile-aware: columns can be marked hideOnMobile
 */

import React          from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

// ── Column definition ─────────────────────────────────────────────────────────

export interface ERPColumn<T> {
  /** Unique key matching a property of T, or any string for custom render */
  key:         string
  /** Column header label */
  header:      string
  /** Custom cell renderer — receives the full row */
  render?:     (row: T) => React.ReactNode
  /** CSS width string (e.g. "12rem", "8%") */
  width?:      string
  /** Text alignment */
  align?:      'left' | 'center' | 'right'
  /** Hide on small screens (< md) */
  hideOnMobile?: boolean
  /** Whether the column is sortable */
  sortable?:   boolean
}

// ── Sort state ────────────────────────────────────────────────────────────────

export interface SortState {
  field: string
  dir:   'asc' | 'desc'
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ERPListTableProps<T> {
  columns:      ERPColumn<T>[]
  rows:         T[]
  /** Used as the React key for each row */
  rowKey:       (row: T) => string
  /** Navigate to detail on row click */
  onRowClick?:  (row: T) => void
  /** Empty state element */
  emptyState?:  React.ReactNode
  /** Show skeleton rows while loading */
  isLoading?:   boolean
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number
  /** Current sort state */
  sort?:        SortState
  /** Called when user clicks a sortable column header */
  onSort?:      (field: string, dir: 'asc' | 'desc') => void
  /** Extra CSS classes for the table wrapper */
  className?:   string
  /** Sticky table header */
  stickyHeader?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ERPListTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyState,
  isLoading = false,
  skeletonRows = 8,
  sort,
  onSort,
  className = '',
  stickyHeader = false,
}: ERPListTableProps<T>) {

  const handleSort = (col: ERPColumn<T>) => {
    if (!col.sortable || !onSort) return
    const newDir = sort?.field === col.key && sort.dir === 'asc' ? 'desc' : 'asc'
    onSort(col.key, newDir)
  }

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-sm border-collapse">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={[
                  'px-4 py-3 font-medium text-gray-600 whitespace-nowrap select-none',
                  col.align === 'right'  ? 'text-right'  :
                  col.align === 'center' ? 'text-center' : 'text-left',
                  col.hideOnMobile ? 'hidden md:table-cell' : '',
                  col.sortable && onSort ? 'cursor-pointer hover:text-gray-900 hover:bg-gray-100 transition-colors' : '',
                ].join(' ')}
                onClick={() => handleSort(col)}
                aria-sort={
                  sort?.field === col.key
                    ? (sort.dir === 'asc' ? 'ascending' : 'descending')
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && onSort && <SortIcon field={col.key} sort={sort} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <tbody>
          {isLoading ? (
            // Skeleton rows
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50 animate-pulse">
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={col.hideOnMobile ? 'hidden md:table-cell px-4 py-3' : 'px-4 py-3'}
                  >
                    <div className="h-4 bg-gray-100 rounded" style={{ width: `${60 + Math.random() * 35}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            // Empty state
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                {emptyState ?? (
                  <span className="text-gray-400 text-sm">Žádné záznamy</span>
                )}
              </td>
            </tr>
          ) : (
            rows.map(row => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={[
                  'border-b border-gray-50 transition-colors',
                  onRowClick ? 'cursor-pointer hover:bg-blue-50/40' : '',
                ].join(' ')}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={[
                      'px-4 py-3',
                      col.align === 'right'  ? 'text-right'  :
                      col.align === 'center' ? 'text-center' : 'text-left',
                      col.hideOnMobile ? 'hidden md:table-cell' : '',
                    ].join(' ')}
                  >
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
  )
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ field, sort }: { field: string; sort?: SortState }) {
  if (!sort || sort.field !== field) {
    return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />
  }
  return sort.dir === 'asc'
    ? <ChevronUp   className="w-3.5 h-3.5 text-blue-600" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
}

// ── Pagination strip ──────────────────────────────────────────────────────────
// Placed inside the table's parent card when pagination is needed.

interface ERPListPaginationProps {
  page:       number
  totalPages: number
  total:      number
  limit:      number
  onPage:     (p: number) => void
}

export function ERPListPagination({
  page,
  totalPages,
  total,
  limit,
  onPage,
}: ERPListPaginationProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * limit + 1
  const to   = Math.min(page * limit, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500 tabular-nums">
        {from}–{to} z {total.toLocaleString('cs-CZ')}
      </p>
      <div className="flex items-center gap-1">
        <PageButton label="«" disabled={page === 1}           onClick={() => onPage(1)} />
        <PageButton label="‹" disabled={page === 1}           onClick={() => onPage(page - 1)} />
        {buildPageRange(page, totalPages).map((p, i) =>
          p === null
            ? <span key={`sep-${i}`} className="px-2 text-gray-400">…</span>
            : (
              <PageButton
                key={p}
                label={String(p)}
                active={p === page}
                onClick={() => onPage(p)}
              />
            )
        )}
        <PageButton label="›" disabled={page === totalPages} onClick={() => onPage(page + 1)} />
        <PageButton label="»" disabled={page === totalPages} onClick={() => onPage(totalPages)} />
      </div>
    </div>
  )
}

function PageButton({
  label, active, disabled, onClick,
}: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'min-w-[2rem] h-8 px-2 rounded text-sm font-medium transition-colors',
        active   ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function buildPageRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | null)[] = [1]
  if (current > 3)              pages.push(null)
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2)      pages.push(null)
  pages.push(total)
  return pages
}
