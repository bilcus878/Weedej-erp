'use client'

/**
 * ERPSectionCard — RBAC-gated section card for detail pages.
 *
 * Features:
 *  - Title + optional icon
 *  - Header action slot (e.g. Edit button)
 *  - Collapsible on mobile
 *  - `requiredPermission` prop — if the current user lacks this permission,
 *    the card renders a locked placeholder instead of leaking sensitive data.
 *    The permission check is done against the session passed via context.
 *  - `isLoading` skeleton
 */

import React, { useCallback, useState } from 'react'
import { ChevronDown, Lock }            from 'lucide-react'
import { useSession }                   from 'next-auth/react'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ERPSectionCardProps {
  /** Section title */
  title:               string
  /** Optional Lucide icon component */
  icon?:               React.ReactNode
  /** Action buttons in the section header */
  headerActions?:      React.ReactNode
  /** Section body content */
  children:            React.ReactNode
  /** If set, user must have this permission to see the content */
  requiredPermission?: string
  /** Show skeleton while data loads */
  isLoading?:          boolean
  /** Allow the card to be collapsed on mobile (defaults to false) */
  collapsible?:        boolean
  /** Control collapsed state externally */
  defaultCollapsed?:   boolean
  /** Extra CSS classes */
  className?:          string
  /** Suppress the card border/shadow — for inline use */
  flat?:               boolean
  /** Optional description below the title */
  description?:        string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ERPSectionCard({
  title,
  icon,
  headerActions,
  children,
  requiredPermission,
  isLoading = false,
  collapsible = false,
  defaultCollapsed = false,
  className = '',
  flat = false,
  description,
}: ERPSectionCardProps) {
  const { data: session }   = useSession()
  const [open, setOpen]     = useState(!defaultCollapsed)

  const toggle = useCallback(() => setOpen(v => !v), [])

  // ── RBAC gate ──────────────────────────────────────────────────────────────
  const permissions: string[] = (session?.user as any)?.permissions ?? []
  const hasAccess = !requiredPermission || permissions.includes(requiredPermission)

  const cardClasses = [
    flat ? '' : 'bg-white rounded-xl border border-gray-200 shadow-sm',
    className,
  ].join(' ')

  return (
    <section className={cardClasses} aria-label={title}>

      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div
        className={[
          'flex items-center justify-between px-5 py-4 border-b border-gray-100',
          collapsible ? 'cursor-pointer select-none hover:bg-gray-50/50 transition-colors' : '',
        ].join(' ')}
        onClick={collapsible ? toggle : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? open : undefined}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span className="text-gray-400 shrink-0 w-4 h-4" aria-hidden="true">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 truncate">{title}</h2>
            {description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Header actions are hidden when the card is collapsed */}
          {headerActions && open && (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              {headerActions}
            </div>
          )}
          {collapsible && (
            <ChevronDown
              className={[
                'w-4 h-4 text-gray-400 transition-transform',
                open ? 'rotate-180' : '',
              ].join(' ')}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* ── Card body ───────────────────────────────────────────────────── */}
      {(!collapsible || open) && (
        <div className="px-5 py-4">
          {isLoading ? (
            <SectionSkeleton />
          ) : !hasAccess ? (
            <LockedPlaceholder permission={requiredPermission!} />
          ) : (
            children
          )}
        </div>
      )}

    </section>
  )
}

// ── Detail row helper ─────────────────────────────────────────────────────────
// Use inside ERPSectionCard for consistent key-value rows.

interface ERPDetailRowProps {
  label:      string
  value:      React.ReactNode
  /** Show a copy-to-clipboard icon */
  copyable?:  boolean
  /** Render the value as a full-width block below the label */
  vertical?:  boolean
  /** Extra CSS */
  className?: string
}

export function ERPDetailRow({ label, value, vertical = false, className = '' }: ERPDetailRowProps) {
  if (vertical) {
    return (
      <div className={`space-y-1 ${className}`}>
        <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
        <dd className="text-sm text-gray-800">{value ?? <span className="text-gray-300">—</span>}</dd>
      </div>
    )
  }
  return (
    <div className={`flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0 ${className}`}>
      <dt className="text-sm text-gray-500 shrink-0 w-40">{label}</dt>
      <dd className="text-sm text-gray-900 text-right font-medium">
        {value ?? <span className="text-gray-300">—</span>}
      </dd>
    </div>
  )
}

// ── Grid layout for detail rows ───────────────────────────────────────────────

interface ERPDetailGridProps {
  children:   React.ReactNode
  cols?:      2 | 3 | 4
  className?: string
}

export function ERPDetailGrid({ children, cols = 2, className = '' }: ERPDetailGridProps) {
  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }[cols]

  return (
    <dl className={`grid ${gridClass} gap-4 ${className}`}>
      {children}
    </dl>
  )
}

// ── Locked placeholder ────────────────────────────────────────────────────────

function LockedPlaceholder({ permission }: { permission: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400">
      <Lock className="w-6 h-6" aria-hidden="true" />
      <p className="text-sm text-center">
        Nemáte oprávnění pro zobrazení této sekce
        <span className="block text-xs mt-0.5 opacity-60">{permission}</span>
      </p>
    </div>
  )
}

// ── Section skeleton ──────────────────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[80, 60, 75, 50].map((w, i) => (
        <div key={i} className="flex justify-between">
          <div className="h-3.5 bg-gray-200 rounded w-32" />
          <div className="h-3.5 bg-gray-100 rounded" style={{ width: `${w}px` }} />
        </div>
      ))}
    </div>
  )
}
