'use client'

import { formatPrice, formatDateTime } from '@/lib/utils'
import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect } from '@/components/erp'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
import type { Transaction } from '../types'
import { TransactionStatusBadge } from './TransactionStatusBadge'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',       label: 'Vše'       },
  { value: 'completed', label: 'Dokončeno', className: 'text-green-600'  },
  { value: 'pending',   label: 'Čeká',      className: 'text-yellow-600' },
  { value: 'storno',    label: 'Storno',    className: 'text-red-600'    },
]

export function createTransactionColumns(filters: FiltersResult<Transaction>): ColumnDef<Transaction>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'code', header: 'Číslo',
      filterNode: <FilterInput className="w-full text-center" value={v['code'] ?? ''} onChange={val => s('code', val)} placeholder="SUP..." />,
      render: r => <p className="text-sm font-bold text-gray-700">{r.transactionCode}</p>,
    },
    {
      key: 'date', header: 'Datum',
      filterNode: <FilterInput className="w-full text-center" type="date" value={v['date'] ?? ''} onChange={val => s('date', val)} />,
      render: r => <p className="text-sm text-gray-900 truncate">{formatDateTime(r.transactionDate)}</p>,
    },
    {
      key: 'sumup', header: 'Kód SumUp',
      filterNode: <FilterInput className="w-full text-center" value={v['sumupCode'] ?? ''} onChange={val => s('sumupCode', val)} placeholder="MS9W..." />,
      render: r => <p className={`text-sm font-bold text-gray-700 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>{r.sumupTransactionCode || '-'}</p>,
    },
    {
      key: 'payment', header: 'Typ platby',
      filterNode: <FilterSelect className="w-full" value={v['payment'] ?? PAYMENT_OPTIONS[0].value} onChange={val => s('payment', val)} options={PAYMENT_OPTIONS} />,
      render: r => <p className="text-sm text-gray-700">{r.paymentType === 'card' ? 'Karta' : 'Hotovost'}</p>,
    },
    {
      key: 'items', header: 'Položek',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['itemsCount'] ?? ''} onChange={val => s('itemsCount', val)} placeholder="=" />,
      render: r => <p className="text-sm text-gray-700">{r.items.filter(i => i.productId !== null).length}</p>,
    },
    {
      key: 'amount', header: 'Částka',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minValue'] ?? ''} onChange={val => s('minValue', val)} placeholder="≥" />,
      render: r => <p className="text-sm font-bold text-gray-900">{formatPrice(r.totalAmount)}</p>,
    },
    {
      key: 'status', header: 'Status',
      filterNode: <FilterSelect className="w-full" value={v['status'] ?? STATUS_OPTIONS[0].value} onChange={val => s('status', val)} options={STATUS_OPTIONS} />,
      render: r => <TransactionStatusBadge status={r.status} />,
    },
  ]
}
