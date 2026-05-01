'use client'

/**
 * ERPListPageLayout — shell for every list/index page in the ERP system.
 *
 * Provides:
 *  - Page title + optional description
 *  - Primary action slot (top-right, e.g. "New Order" button)
 *  - Filter row slot
 *  - Stats/summary strip slot (optional)
 *  - Main content area (table or card list)
 *  - Mobile-first: header stacks vertically on small screens
 */

import React from 'react'

interface ERPListPageLayoutProps {
  /** Page heading (e.g. "Objednávky zákazníků") */
  title:       string
  /** Optional subtitle shown below the title */
  description?: string
  /** Top-right action area — primary button(s) */
  actions?:    React.ReactNode
  /** Filter row rendered above the data area */
  filters?:    React.ReactNode
  /** Optional narrow stats strip rendered between filters and the data */
  stats?:      React.ReactNode
  /** The table or card list */
  children:    React.ReactNode
  /** Show full-page skeleton while data loads */
  isLoading?:  boolean
}

export function ERPListPageLayout({
  title,
  description,
  actions,
  filters,
  stats,
  children,
  isLoading = false,
}: ERPListPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        {filters && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
            {filters}
          </div>
        )}

        {/* ── Stats strip ────────────────────────────────────────────────── */}
        {stats && !isLoading && (
          <div>{stats}</div>
        )}

        {/* ── Data area ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? <ERPListSkeleton /> : children}
        </div>

      </div>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ERPListSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Table header skeleton */}
      <div className="border-b border-gray-100 px-6 py-3 flex gap-4">
        {[40, 20, 15, 15, 10].map((w, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-b border-gray-50 px-6 py-4 flex gap-4 items-center">
          {[40, 20, 15, 15, 10].map((w, j) => (
            <div key={j} className="h-4 bg-gray-100 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
