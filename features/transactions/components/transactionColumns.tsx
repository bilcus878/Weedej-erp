'use client'

import { formatPrice, formatDateTime } from '@/lib/utils'
import type { ColumnDef } from '@/components/erp'
import type { Transaction } from '../types'
import { TransactionStatusBadge } from './TransactionStatusBadge'

export const transactionColumns: ColumnDef<Transaction>[] = [
  {
    key: 'code',   header: 'Číslo',
    render: r => <p className="text-sm font-bold text-gray-700">{r.transactionCode}</p>,
  },
  {
    key: 'date',   header: 'Datum',
    render: r => <p className="text-sm text-gray-900 truncate">{formatDateTime(r.transactionDate)}</p>,
  },
  {
    key: 'sumup',  header: 'Kód SumUp',
    render: r => <p className={`text-sm font-bold text-gray-700 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>{r.sumupTransactionCode || '-'}</p>,
  },
  {
    key: 'payment', header: 'Typ platby',
    render: r => <p className="text-sm text-gray-700">{r.paymentType === 'card' ? 'Karta' : 'Hotovost'}</p>,
  },
  {
    key: 'items',  header: 'Položek',
    render: r => <p className="text-sm text-gray-700">{r.items.filter(i => i.productId !== null).length}</p>,
  },
  {
    key: 'amount', header: 'Částka',
    render: r => <p className="text-sm font-bold text-gray-900">{formatPrice(r.totalAmount)}</p>,
  },
  {
    key: 'status', header: 'Status',
    render: r => <TransactionStatusBadge status={r.status} />,
  },
]
