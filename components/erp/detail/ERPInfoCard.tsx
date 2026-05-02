'use client'

/**
 * ERPInfoCard + ERPInfoRow — lightweight section card for detail pages.
 *
 * Lighter than ERPSectionCard: no RBAC, no collapse, no loading skeleton.
 * Used for compact read-only info blocks (returns, customer-orders, etc.).
 *
 * ERPInfoCard — white card with icon + title header
 * ERPInfoRow  — compact label/value row (text-xs, py-1.5)
 */

import React from 'react'

// ── ERPInfoCard ───────────────────────────────────────────────────────────────

interface ERPInfoCardProps {
  title:      string
  icon:       React.ElementType
  children:   React.ReactNode
  /** Rendered in the header, right-aligned (e.g. edit button) */
  action?:    React.ReactNode
  className?: string
}

export function ERPInfoCard({ title, icon: Icon, children, action, className = '' }: ERPInfoCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── ERPInfoRow ────────────────────────────────────────────────────────────────

interface ERPInfoRowProps {
  label:      string
  value:      React.ReactNode
  className?: string
}

export function ERPInfoRow({ label, value, className = '' }: ERPInfoRowProps) {
  return (
    <div className={`flex items-start justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0 ${className}`}>
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right min-w-0">
        {value ?? <span className="text-gray-300">—</span>}
      </span>
    </div>
  )
}
