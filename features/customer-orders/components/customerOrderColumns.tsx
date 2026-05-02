'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/shared/dates/format'
import { formatPrice } from '@/lib/shared/finance/money'
import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect, FilterCombobox } from '@/components/erp'
import { PAYMENT_OPTIONS } from '@/features/shared/paymentOptions'
import type { CustomerOrder } from '../types'
import { CustomerOrderStatusBadge } from './CustomerOrderStatusBadge'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',        label: 'Vše'                                           },
  { value: 'new',        label: 'Nová',          className: 'text-yellow-600'   },
  { value: 'paid',       label: 'Zaplacená',     className: 'text-green-600'    },
  { value: 'processing', label: 'Připravuje se', className: 'text-blue-600'     },
  { value: 'shipped',    label: 'Odeslaná',      className: 'text-purple-600'   },
  { value: 'delivered',  label: 'Doručená',      className: 'text-teal-600'     },
  { value: 'cancelled',  label: 'Zrušená',       className: 'text-red-600'      },
]

export function createCustomerOrderColumns(
  filters: FiltersResult<CustomerOrder>,
  onMarkPaid?: (orderId: string) => void,
  customerSuggestions: string[] = [],
): ColumnDef<CustomerOrder>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'number', header: 'Číslo',
      filterNode: <FilterInput className="w-full text-center" value={v['number'] ?? ''} onChange={val => s('number', val)} placeholder="OBJ..." />,
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
      filterNode: <FilterInput className="w-full text-center" type="date" value={v['date'] ?? ''} onChange={val => s('date', val)} />,
      render: r => <p className="text-sm text-gray-900 truncate">{formatDate(r.orderDate)}</p>,
    },
    {
      key: 'customer', header: 'Odběratel',
      filterNode: (
        <FilterCombobox
          className="w-full"
          inputClassName="text-center"
          value={v['customer'] ?? ''}
          onChange={val => s('customer', val)}
          placeholder="Odběratel..."
          options={customerSuggestions}
        />
      ),
      render: r => r.customer?.id
        ? <a href={`/customers?highlight=${r.customer.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{r.customer.name}</a>
        : <p className="text-sm text-gray-700 truncate">{r.customerName || '-'}</p>,
    },
    {
      key: 'payment', header: 'Typ platby',
      filterNode: <FilterSelect className="w-full" value={v['payment'] ?? PAYMENT_OPTIONS[0].value} onChange={val => s('payment', val)} options={PAYMENT_OPTIONS} />,
      render: r => (
        <p className="text-sm text-gray-700">
          {r.issuedInvoice?.paymentType === 'cash' ? 'Hotovost'
            : r.issuedInvoice?.paymentType === 'card' ? 'Karta'
            : r.issuedInvoice?.paymentType === 'transfer' ? 'Převod'
            : '-'}
        </p>
      ),
    },
    {
      key: 'items', header: 'Položek',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minItems'] ?? ''} onChange={val => s('minItems', val)} placeholder="≥" />,
      render: r => <p className="text-sm text-gray-700">{r.items.length}</p>,
    },
    {
      key: 'value', header: 'Hodnota',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minValue'] ?? ''} onChange={val => s('minValue', val)} placeholder="≥" />,
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
      filterNode: <FilterSelect className="w-full" value={v['status'] ?? STATUS_OPTIONS[0].value} onChange={val => s('status', val)} options={STATUS_OPTIONS} />,
      render: r => <CustomerOrderStatusBadge status={r.status} />,
    },
  ]
}

// ── Mobile card ───────────────────────────────────────────────────────────────
// Purpose-fit ERP card — hierarchy: number → amount → customer → date.
// Designed for <1s recognition; does not use generic ERPMobileCard.

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
