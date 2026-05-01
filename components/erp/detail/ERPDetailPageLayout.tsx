'use client'

/**
 * ERPDetailPageLayout — shell for every detail/edit page in the ERP system.
 *
 * Provides:
 *  - Breadcrumb navigation
 *  - Document number + title header
 *  - Status badge (top-right)
 *  - Header action buttons slot
 *  - Two-column responsive content grid (main + sidebar)
 *  - Loading skeleton
 *  - Error state
 *  - Not-found state
 */

import React    from 'react'
import Link     from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'

// ── Breadcrumb types ──────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string
  href?: string
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ERPDetailPageLayoutProps {
  /** Breadcrumb trail e.g. [{ label: 'Objednávky', href: '/customer-orders' }, { label: 'OBJ-0042' }] */
  breadcrumbs:   BreadcrumbItem[]
  /** Page heading — usually the document number */
  title:         string
  /** Optional sub-title below the heading */
  subtitle?:     React.ReactNode
  /** Status badge rendered in the header */
  statusBadge?:  React.ReactNode
  /** Header action buttons (top-right) */
  actions?:      React.ReactNode
  /** Main content (left column, wider) */
  children?:     React.ReactNode
  /** Sidebar content (right column, narrower) — optional */
  sidebar?:      React.ReactNode
  /** Show full skeleton while data loads */
  isLoading?:    boolean
  /** Error message to show instead of content */
  error?:        string | null
  /** Show 404-style state */
  notFound?:     boolean
  /** Back-link label (uses breadcrumbs[last-1] if not provided) */
  backLabel?:    string
  backHref?:     string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ERPDetailPageLayout({
  breadcrumbs,
  title,
  subtitle,
  statusBadge,
  actions,
  children,
  sidebar,
  isLoading = false,
  error,
  notFound = false,
  backLabel,
  backHref,
}: ERPDetailPageLayoutProps) {

  // Derive back-link from breadcrumbs when not explicit
  const backItem  = breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2] : null
  const backHrefResolved  = backHref  ?? backItem?.href  ?? '/'
  const backLabelResolved = backLabel ?? backItem?.label ?? 'Zpět'

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-5xl font-bold text-gray-300">404</p>
          <p className="text-lg text-gray-500">Záznam nebyl nalezen</p>
          <Link href={backHrefResolved}
            className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm">
            <ArrowLeft className="w-4 h-4" />
            {backLabelResolved}
          </Link>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-red-500 font-medium">Chyba při načítání</p>
          <p className="text-sm text-gray-600">{error}</p>
          <Link href={backHrefResolved}
            className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm">
            <ArrowLeft className="w-4 h-4" />
            {backLabelResolved}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* ── Breadcrumbs ─────────────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
          {breadcrumbs.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
              {item.href && i < breadcrumbs.length - 1 ? (
                <Link href={item.href} className="hover:text-gray-900 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''}>
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <HeaderSkeleton />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {statusBadge && <div className="shrink-0">{statusBadge}</div>}
              </div>
              {subtitle && (
                <div className="text-sm text-gray-500">{subtitle}</div>
              )}
            </div>
            {actions && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {actions}
              </div>
            )}
          </div>
        )}

        {/* ── Content grid ────────────────────────────────────────────────── */}
        {isLoading ? (
          <ContentSkeleton hasSidebar={!!sidebar} />
        ) : (
          <div className={[
            'grid gap-5',
            sidebar ? 'lg:grid-cols-[1fr_340px]' : 'grid-cols-1',
          ].join(' ')}>
            {/* Main column */}
            <div className="space-y-5 min-w-0">
              {children}
            </div>
            {/* Sidebar */}
            {sidebar && (
              <div className="space-y-5">
                {sidebar}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="animate-pulse flex items-start justify-between">
      <div className="space-y-2">
        <div className="h-7 bg-gray-200 rounded w-64" />
        <div className="h-4 bg-gray-100 rounded w-40" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 bg-gray-200 rounded w-28" />
        <div className="h-9 bg-gray-200 rounded w-24" />
      </div>
    </div>
  )
}

function ContentSkeleton({ hasSidebar }: { hasSidebar: boolean }) {
  return (
    <div className={[
      'grid gap-5 animate-pulse',
      hasSidebar ? 'lg:grid-cols-[1fr_340px]' : 'grid-cols-1',
    ].join(' ')}>
      <div className="space-y-5">
        {[120, 200, 160].map((h, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
            <div className="h-px bg-gray-100 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded" style={{ width: `${50 + j * 15}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {hasSidebar && (
        <div className="space-y-5">
          {[100, 140].map((h, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
              <div className="space-y-2">
                {[60, 80, 70].map((w, j) => (
                  <div key={j} className="h-3 bg-gray-100 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
