'use client'

import Button from '@/components/ui/Button'
import { formatDate, formatPrice } from '@/lib/utils'
import type { ColumnDef } from '@/components/erp'
import type { CustomerOrder } from '../types'
import { CustomerOrderStatusBadge } from './CustomerOrderStatusBadge'

export function customerOrderColumns(onMarkPaid: (orderId: string) => void): ColumnDef<CustomerOrder>[] {
  return [
    {
      key: 'number', header: 'Číslo',
      render: r => (
        <p className={`text-sm font-medium text-gray-700 ${r.status === 'storno' ? 'line-through' : ''}`}>
          {r.orderNumber}
        </p>
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
          {r.issuedInvoice?.paymentType === 'cash' ? 'Hotovost'
            : r.issuedInvoice?.paymentType === 'card' ? 'Karta'
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
          {r.status === 'new' && (
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
