'use client'

import Button from '@/components/ui/Button'
import { formatDate, formatPrice } from '@/lib/utils'
import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect, FilterCombobox } from '@/components/erp'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
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
  onMarkPaid: (orderId: string) => void,
  customerSuggestions: string[] = [],
): ColumnDef<CustomerOrder>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'number', header: 'Číslo',
      filterNode: <FilterInput className="w-full text-center" value={v['number'] ?? ''} onChange={val => s('number', val)} placeholder="OBJ..." />,
      render: r => (
        <p className={`text-sm font-medium text-gray-700 ${r.status === 'storno' ? 'line-through' : ''}`}>
          {r.orderNumber}
        </p>
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
          {r.status === 'new' && (
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
