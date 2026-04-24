'use client'

import { formatDate, formatPrice } from '@/lib/utils'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { calcPackCount } from '@/lib/packQuantity'
import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect, FilterCombobox } from '@/components/erp'
import { DeliveryNoteStatusBadge } from './DeliveryNoteStatusBadge'
import type { DeliveryNote } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',       label: 'Vše'                                    },
  { value: 'delivered', label: 'Expedováno', className: 'text-green-600' },
  { value: 'storno',    label: 'Storno',     className: 'text-red-600'   },
]

export function createDeliveryNoteColumns(
  filters: FiltersResult<DeliveryNote>,
  isVatPayer: boolean,
  customerSuggestions: string[] = [],
): ColumnDef<DeliveryNote>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'number', header: 'Číslo',
      filterNode: <FilterInput className="w-full text-center" value={v['number'] ?? ''} onChange={val => s('number', val)} placeholder="Číslo..." />,
      render: r => (
        <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
          {r.deliveryNumber}
        </p>
      ),
    },
    {
      key: 'date', header: 'Datum',
      filterNode: <FilterInput className="w-full text-center" type="date" value={v['date'] ?? ''} onChange={val => s('date', val)} />,
      render: r => <p className="text-sm text-gray-700">{formatDate(r.deliveryDate)}</p>,
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
        : <p className="text-sm text-gray-700 truncate">{r.customerName || 'Anonymní zákazník'}</p>,
    },
    {
      key: 'items', header: 'Položek',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minItems'] ?? ''} onChange={val => s('minItems', val)} placeholder="≥" />,
      render: r => <p className="text-sm text-gray-600">{r.items.length}</p>,
    },
    {
      key: 'value', header: 'Hodnota',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minValue'] ?? ''} onChange={val => s('minValue', val)} placeholder="≥" />,
      render: r => (
        <p className="text-sm font-bold text-gray-900">
          {r.items.length > 0 ? formatPrice(r.items.reduce((sum, item) => {
            const hasSaved    = item.price != null && item.priceWithVat != null
            const unitPrice   = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
            const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
            const nonVat      = isNonVatPayer(itemVatRate)
            const vatPer      = hasSaved ? Number(item.vatAmount ?? 0) : (nonVat ? 0 : unitPrice * itemVatRate / 100)
            const withVat     = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPer)
            const packs       = calcPackCount(Number(item.quantity), item.productName, item.unit)
            return sum + packs * (isVatPayer ? withVat : unitPrice)
          }, 0)) : '-'}
        </p>
      ),
    },
    {
      key: 'status', header: 'Status',
      filterNode: <FilterSelect className="w-full" value={v['status'] ?? STATUS_OPTIONS[0].value} onChange={val => s('status', val)} options={STATUS_OPTIONS} />,
      render: r => <DeliveryNoteStatusBadge status={r.status} />,
    },
  ]
}
