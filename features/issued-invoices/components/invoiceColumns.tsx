'use client'

import { formatPrice } from '@/lib/utils'
import type { ColumnDef } from '@/components/erp'
import type { IssuedInvoice } from '../types'
import { StatusBadge } from './StatusBadge'

export const invoiceColumns: ColumnDef<IssuedInvoice>[] = [
  {
    key: 'number', header: 'Číslo',
    render: r => (
      <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
        {r.transactionCode}
      </p>
    ),
  },
  {
    key: 'date', header: 'Datum',
    render: r => <p className="text-sm text-gray-700">{new Date(r.transactionDate).toLocaleDateString('cs-CZ')}</p>,
  },
  {
    key: 'customer', header: 'Odběratel',
    render: r => {
      if (r.customer?.id) return (
        <a href={`/customers?highlight=${r.customer.id}`}
          className="text-sm text-blue-600 hover:underline truncate block"
          onClick={e => e.stopPropagation()}>
          {r.customer.name}
        </a>
      )
      if (r.customerName && r.customerName !== 'Anonymní zákazník' && r.customerName !== 'Anonymní odběratel') return (
        <p className="text-sm text-gray-700 truncate">{r.customerName} <span className="text-xs text-gray-500">(ruční)</span></p>
      )
      return <p className="text-sm text-gray-400 italic">Bez odběratele</p>
    },
  },
  {
    key: 'payment', header: 'Typ platby',
    render: r => <p className="text-sm">{r.paymentType === 'cash' ? 'Hotovost' : r.paymentType === 'card' ? 'Karta' : r.paymentType === 'transfer' ? 'Převod' : '-'}</p>,
  },
  {
    key: 'items', header: 'Položek',
    render: r => <p className="text-sm text-gray-600">{r.items.filter(i => i.productId !== null).length}</p>,
  },
  {
    key: 'value', header: 'Hodnota',
    render: r => <p className="text-sm font-bold text-gray-900">{formatPrice(r.totalAmount)}</p>,
  },
  {
    key: 'status', header: 'Status',
    render: r => <StatusBadge status={r.status} />,
  },
]
