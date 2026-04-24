'use client'

import { formatDate, formatPrice } from '@/lib/utils'
import { isNonVatPayer } from '@/lib/vatCalculation'
import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect, FilterCombobox } from '@/components/erp'
import { ReceiptStatusBadge } from './ReceiptStatusBadge'
import type { Receipt } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',      label: 'Vše'                                   },
  { value: 'received', label: 'Přijato', className: 'text-green-600' },
  { value: 'storno',   label: 'Storno',  className: 'text-red-600'   },
]

export function createReceiptColumns(
  filters: FiltersResult<Receipt>,
  isVatPayer: boolean,
  supplierSuggestions: string[] = [],
): ColumnDef<Receipt>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'number', header: 'Číslo',
      filterNode: <FilterInput className="w-full text-center" value={v['number'] ?? ''} onChange={val => s('number', val)} placeholder="Číslo..." />,
      render: r => (
        <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' || r.status === 'cancelled' ? 'line-through' : ''}`}>
          {r.receiptNumber}
        </p>
      ),
    },
    {
      key: 'date', header: 'Datum',
      filterNode: <FilterInput className="w-full text-center" type="date" value={v['date'] ?? ''} onChange={val => s('date', val)} />,
      render: r => <p className="text-sm text-gray-700">{formatDate(r.receiptDate)}</p>,
    },
    {
      key: 'supplier', header: 'Dodavatel',
      filterNode: (
        <FilterCombobox
          className="w-full"
          inputClassName="text-center"
          value={v['supplier'] ?? ''}
          onChange={val => s('supplier', val)}
          placeholder="Dodavatel..."
          options={supplierSuggestions}
        />
      ),
      render: r => {
        const supplierId   = r.purchaseOrder?.supplier?.id || r.supplier?.id
        const supplierName = r.purchaseOrder?.supplier?.name || r.supplier?.name || r.supplierName || '-'
        return supplierId
          ? <a href={`/suppliers?highlight=${supplierId}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{supplierName}</a>
          : <p className="text-sm text-gray-700 truncate">{supplierName}</p>
      },
    },
    {
      key: 'items', header: 'Položek',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minItems'] ?? ''} onChange={val => s('minItems', val)} placeholder="≥" />,
      render: r => <p className="text-sm text-gray-600">{r.items.length}</p>,
    },
    {
      key: 'value', header: 'Hodnota',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minValue'] ?? ''} onChange={val => s('minValue', val)} placeholder="≥" />,
      render: r => {
        const total = r.items.reduce((sum, item) => {
          const qty         = Number(item.receivedQuantity || item.quantity)
          const unitPrice   = Number(item.purchasePrice || 0)
          const itemVatRate = Number((item as any).vatRate || item.product?.vatRate || 21)
          const vatPerUnit  = isVatPayer && !isNonVatPayer(itemVatRate) ? unitPrice * itemVatRate / 100 : 0
          return sum + qty * (unitPrice + vatPerUnit)
        }, 0)
        return <p className="text-sm font-bold text-gray-900">{formatPrice(total)}</p>
      },
    },
    {
      key: 'status', header: 'Status',
      filterNode: <FilterSelect className="w-full" value={v['status'] ?? STATUS_OPTIONS[0].value} onChange={val => s('status', val)} options={STATUS_OPTIONS} />,
      render: r => <ReceiptStatusBadge status={r.status} />,
    },
  ]
}
