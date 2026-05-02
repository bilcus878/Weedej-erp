'use client'

import React       from 'react'
import { ArrowLeft } from 'lucide-react'

/**
 * ERPDetailHeader — mobile-first detail page header card.
 *
 * Layout on mobile  : two rows — [back · icon · title · badge] then [actions]
 * Layout on sm+     : single row — identity left, actions right (ml-auto)
 *
 * Usage:
 *   <ERPDetailHeader
 *     title={order.orderNumber}
 *     titleMono
 *     subtitle="2. 5. 2026 · fghfgh"
 *     icon={ShoppingCart}
 *     iconBg="bg-violet-100"
 *     iconColor="text-violet-600"
 *     onBack={() => router.push('/customer-orders')}
 *     badge={<CustomerOrderStatusBadge status={order.status} />}
 *     actions={<>...</>}
 *   />
 */

interface ERPDetailHeaderProps {
  title:       string
  /** Render title in monospace font (order numbers, invoice numbers, etc.) */
  titleMono?:  boolean
  subtitle?:   React.ReactNode
  icon:        React.ElementType
  iconBg?:     string
  iconColor?:  string
  onBack:      () => void
  /** Status badge or any inline element placed after the title */
  badge?:      React.ReactNode
  /** All action buttons — rendered in a flex-wrap row below identity on mobile,
   *  right-aligned inline on sm+ */
  actions?:    React.ReactNode
}

export function ERPDetailHeader({
  title,
  titleMono  = false,
  subtitle,
  icon: Icon,
  iconBg     = 'bg-gray-100',
  iconColor  = 'text-gray-600',
  onBack,
  badge,
  actions,
}: ERPDetailHeaderProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 sm:px-5 sm:py-3.5">

        {/* Back */}
        <button
          onClick={onBack}
          className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Zpět"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>

        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden />
        </div>

        {/* Identity — fills remainder of first row on mobile */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={[
                'text-base font-bold text-gray-900 leading-tight',
                titleMono ? 'font-mono tracking-tight' : '',
              ].join(' ')}
            >
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Actions — basis-full = own row on mobile, ml-auto inline on sm+ */}
        {actions && (
          <div className="flex items-center gap-2 basis-full sm:basis-auto sm:ml-auto flex-wrap">
            {actions}
          </div>
        )}

      </div>
    </div>
  )
}
