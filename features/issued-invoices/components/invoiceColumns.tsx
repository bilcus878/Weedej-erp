'use client'

import { formatPrice } from '@/lib/utils'
import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect, FilterCombobox } from '@/components/erp'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
import type { IssuedInvoice } from '../types'
import { StatusBadge } from './StatusBadge'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',        label: 'Vše'                                       },
  { value: 'new',        label: 'Nová',          className: 'text-yellow-600' },
  { value: 'paid',       label: 'Zaplacená',     className: 'text-green-600'  },
  { value: 'processing', label: 'Připravuje se', className: 'text-blue-600'   },
  { value: 'shipped',    label: 'Odesláno',      className: 'text-purple-600' },
  { value: 'delivered',  label: 'Předáno',       className: 'text-teal-600'   },
  { value: 'cancelled',  label: 'Zrušená',       className: 'text-red-600'    },
  { value: 'storno',     label: 'STORNO',        className: 'text-red-600'    },
]

export function createInvoiceColumns(
  filters: FiltersResult<IssuedInvoice>,
  customerSuggestions: string[] = [],
): ColumnDef<IssuedInvoice>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'number', header: 'Číslo',
      filterNode: (
        <FilterInput
          className="w-full"
          value={v['number'] ?? ''}
          onChange={val => s('number', val)}
          placeholder="Číslo..."
        />
      ),
      render: r => (
        <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
          {r.transactionCode}
        </p>
      ),
    },
    {
      key: 'date', header: 'Datum',
      filterNode: (
        <FilterInput
          className="w-full"
          type="date"
          value={v['date'] ?? ''}
          onChange={val => s('date', val)}
        />
      ),
      render: r => <p className="text-sm text-gray-700">{new Date(r.transactionDate).toLocaleDateString('cs-CZ')}</p>,
    },
    {
      key: 'customer', header: 'Odběratel',
      filterNode: (
        <FilterCombobox
          className="w-full"
          value={v['customer'] ?? ''}
          onChange={val => s('customer', val)}
          placeholder="Odběratel..."
          options={customerSuggestions}
        />
      ),
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
      filterNode: (
        <FilterSelect
          className="w-full"
          value={v['payment'] ?? PAYMENT_OPTIONS[0]?.value ?? ''}
          onChange={val => s('payment', val)}
          options={PAYMENT_OPTIONS}
        />
      ),
      render: r => <p className="text-sm">{r.paymentType === 'cash' ? 'Hotovost' : r.paymentType === 'card' ? 'Karta' : r.paymentType === 'transfer' ? 'Převod' : '-'}</p>,
    },
    {
      key: 'items', header: 'Položek',
      filterNode: (
        <FilterInput
          className="w-full"
          type="number"
          value={v['minItems'] ?? ''}
          onChange={val => s('minItems', val)}
          placeholder="≥"
        />
      ),
      render: r => <p className="text-sm text-gray-600">{r.items.filter(i => i.productId !== null).length}</p>,
    },
    {
      key: 'value', header: 'Hodnota',
      filterNode: (
        <FilterInput
          className="w-full"
          type="number"
          value={v['minValue'] ?? ''}
          onChange={val => s('minValue', val)}
          placeholder="≥"
        />
      ),
      render: r => <p className="text-sm font-bold text-gray-900">{formatPrice(r.totalAmount)}</p>,
    },
    {
      key: 'status', header: 'Status',
      filterNode: (
        <FilterSelect
          className="w-full"
          value={v['status'] ?? STATUS_OPTIONS[0]?.value ?? ''}
          onChange={val => s('status', val)}
          options={STATUS_OPTIONS}
        />
      ),
      render: r => <StatusBadge status={r.status} />,
    },
  ]
}
