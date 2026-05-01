'use client'

/**
 * ERPResponsiveList — unified mobile-first list component.
 *
 * Behaviour:
 *  - Mobile (< md = 768 px):  renders card-based list via `renderCard`
 *  - Desktop (≥ md):          renders ERPListTable
 *
 * This resolves the broken mobile table experience in the Returns module
 * and establishes the standard for all ERP list pages.
 *
 * Usage:
 *   <ERPResponsiveList
 *     columns={cols}
 *     rows={orders}
 *     rowKey={r => r.id}
 *     renderCard={row => <OrderCard order={row} />}
 *     onRowClick={r => router.push(`/customer-orders/${r.id}`)}
 *   />
 */

import React                    from 'react'
import { ERPListTable }         from './ERPListTable'
import type { ERPColumn, SortState } from './ERPListTable'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ERPResponsiveListProps<T> {
  columns:      ERPColumn<T>[]
  rows:         T[]
  rowKey:       (row: T) => string
  /** Mobile card renderer — receives the full row */
  renderCard:   (row: T, onClick?: () => void) => React.ReactNode
  onRowClick?:  (row: T) => void
  emptyState?:  React.ReactNode
  isLoading?:   boolean
  skeletonRows?: number
  sort?:        SortState
  onSort?:      (field: string, dir: 'asc' | 'desc') => void
  stickyHeader?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ERPResponsiveList<T>({
  columns,
  rows,
  rowKey,
  renderCard,
  onRowClick,
  emptyState,
  isLoading = false,
  skeletonRows = 8,
  sort,
  onSort,
  stickyHeader = false,
}: ERPResponsiveListProps<T>) {
  return (
    <>
      {/* ── Mobile card list (hidden on md+) ──────────────────────────── */}
      <div className="md:hidden">
        {isLoading ? (
          <MobileCardSkeleton count={skeletonRows} />
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            {emptyState ?? <span className="text-gray-400 text-sm">Žádné záznamy</span>}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map(row => (
              <li key={rowKey(row)}>
                {renderCard(row, onRowClick ? () => onRowClick(row) : undefined)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Desktop table (hidden on mobile) ─────────────────────────── */}
      <div className="hidden md:block">
        <ERPListTable
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          onRowClick={onRowClick}
          emptyState={emptyState}
          isLoading={isLoading}
          skeletonRows={skeletonRows}
          sort={sort}
          onSort={onSort}
          stickyHeader={stickyHeader}
        />
      </div>
    </>
  )
}

// ── Mobile card skeleton ──────────────────────────────────────────────────────

function MobileCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="divide-y divide-gray-100 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="px-4 py-4 space-y-2">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-5 bg-gray-200 rounded w-20" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-48" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </li>
      ))}
    </ul>
  )
}

// ── Standard ERP mobile card ──────────────────────────────────────────────────
// A default card layout — modules that need custom layouts implement their own.

export interface ERPMobileCardField {
  label:  string
  value:  React.ReactNode
  full?:  boolean // span full width
}

interface ERPMobileCardProps {
  /** Top-left: document number / ID */
  title:      React.ReactNode
  /** Top-right: status badge */
  badge?:     React.ReactNode
  /** Secondary line (e.g. customer name) */
  subtitle?:  React.ReactNode
  /** Key-value fields in the card body */
  fields?:    ERPMobileCardField[]
  /** Bottom-right: amount / main KPI */
  amount?:    React.ReactNode
  /** Tap handler */
  onClick?:   () => void
}

export function ERPMobileCard({
  title,
  badge,
  subtitle,
  fields = [],
  amount,
  onClick,
}: ERPMobileCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={[
        'px-4 py-3.5 space-y-2',
        onClick ? 'cursor-pointer active:bg-blue-50 hover:bg-gray-50/60 transition-colors' : '',
      ].join(' ')}
    >
      {/* Row 1: title + badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-gray-900 text-sm truncate">{title}</span>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Row 2: subtitle */}
      {subtitle && (
        <div className="text-sm text-gray-600 truncate">{subtitle}</div>
      )}

      {/* Row 3+: fields grid */}
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
          {fields.map((f, i) => (
            <div key={i} className={f.full ? 'col-span-2' : ''}>
              <span className="text-xs text-gray-400 block">{f.label}</span>
              <span className="text-sm text-gray-700">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Amount */}
      {amount && (
        <div className="flex justify-end pt-1">
          <span className="font-semibold text-gray-900">{amount}</span>
        </div>
      )}
    </div>
  )
}
