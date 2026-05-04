'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/shared/dates/format'
import { formatPrice } from '@/lib/shared/finance/money'
import type { ColumnDef } from '@/components/erp'
import type { CustomerOrder } from '../types'
import { CustomerOrderStatusBadge } from './CustomerOrderStatusBadge'

export function createCustomerOrderColumns(
  onMarkPaid?: (orderId: string) => void,
): ColumnDef<CustomerOrder>[] {
  return [
    {
      key: 'number', header: 'Číslo',
      render: r => (
        <Link
          href={`/customer-orders/${r.id}`}
          className={`text-sm font-semibold text-violet-600 hover:text-violet-800 hover:underline font-mono ${r.status === 'storno' ? 'line-through' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          {r.orderNumber}
        </Link>
      ),
    },
    {
      key: 'date', header: 'Datum',
      render: r => <p className="text-sm text-gray-900 truncate">{formatDate(r.orderDate)}</p>,
    },
    {
      key: 'customer', header: 'Odběratel',
      render: r => r.customer?.id
        ? <a href={`/customers?highlight=${r.customer.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{r.customer.name}</a>
        : <p className="text-sm text-gray-700 truncate">{r.customerName || '-'}</p>,
    },
    {
      key: 'payment', header: 'Typ platby',
      render: r => (
        <p className="text-sm text-gray-700">
          {r.issuedInvoice?.paymentType === 'cash'     ? 'Hotovost'
          : r.issuedInvoice?.paymentType === 'card'     ? 'Karta'
          : r.issuedInvoice?.paymentType === 'transfer' ? 'Převod'
          : '-'}
        </p>
      ),
    },
    {
      key: 'items', header: 'Položek',
      render: r => <p className="text-sm text-gray-700">{r.items.length}</p>,
    },
    {
      key: 'value', header: 'Hodnota',
      render: r => (
        <div className="flex items-center justify-center gap-2">
          {r.status === 'new' && onMarkPaid && (
            <Button size="sm" onClick={e => { e.stopPropagation(); onMarkPaid(r.id) }}>Zaplaceno</Button>
          )}
          <p className="text-sm font-bold text-gray-900">{formatPrice(r.totalAmount)}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: r => <CustomerOrderStatusBadge status={r.status} />,
    },
  ]
}

// ── Mobile card ───────────────────────────────────────────────────────────────
// Hierarchy: number → amount → customer → date.
// Designed for <1s recognition; does not use a generic ERPMobileCard.

export function CustomerOrderMobileCard({
  order,
  onClick,
}: {
  order:    CustomerOrder
  onClick?: () => void
}) {
  const isStorno = order.status === 'storno'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={[
        'px-4 py-3.5 select-none',
        isStorno ? 'opacity-60' : '',
        onClick ? 'cursor-pointer hover:bg-gray-50 active:bg-blue-50/60 transition-colors' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Primary: order number + status — scanned first */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`font-mono text-sm font-bold text-violet-700 leading-none${isStorno ? ' line-through' : ''}`}>
          {order.orderNumber}
        </span>
        <CustomerOrderStatusBadge status={order.status} />
      </div>

      {/* Secondary: amount (financial KPI) + customer name */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base font-bold text-gray-900 tabular-nums leading-tight shrink-0">
          {formatPrice(order.totalAmount)}
        </span>
        <span className="text-sm text-gray-500 truncate text-right min-w-0">
          {order.customer?.name || order.customerName || '—'}
        </span>
      </div>

      {/* Tertiary: date — contextual, low weight */}
      <div className="mt-1.5 text-xs text-gray-400">
        {formatDate(order.orderDate)}
      </div>
    </div>
  )
}
