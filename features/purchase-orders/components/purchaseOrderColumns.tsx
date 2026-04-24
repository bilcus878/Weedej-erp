'use client'

import { formatDate, formatPrice } from '@/lib/utils'
import { isNonVatPayer } from '@/lib/vatCalculation'
import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect, FilterCombobox } from '@/components/erp'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
import type { PurchaseOrder, Supplier } from '../types'
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge'

const PAYMENT_LABELS: Record<string, string> = { cash: 'Hotovost', card: 'Karta', transfer: 'Převod' }

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',                label: 'Vše'                                       },
  { value: 'pending',            label: 'Čeká',      className: 'text-yellow-600'  },
  { value: 'confirmed',          label: 'Potvrzena', className: 'text-blue-600'    },
  { value: 'partially_received', label: 'Částečně',  className: 'text-orange-600'  },
  { value: 'received',           label: 'Přijata',   className: 'text-green-600'   },
  { value: 'storno',             label: 'Storno',    className: 'text-red-600'     },
]

export function createPurchaseOrderColumns(
  filters: FiltersResult<PurchaseOrder>,
  suppliers: Supplier[],
  isVatPayer: boolean,
  supplierSuggestions: string[] = [],
): ColumnDef<PurchaseOrder>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'number', header: 'Číslo',
      filterNode: <FilterInput className="w-full text-center" value={v['number'] ?? ''} onChange={val => s('number', val)} placeholder="Číslo..." />,
      render: r => (
        <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
          {r.orderNumber}
        </p>
      ),
    },
    {
      key: 'date', header: 'Datum',
      filterNode: <FilterInput className="w-full text-center" type="date" value={v['date'] ?? ''} onChange={val => s('date', val)} />,
      render: r => <p className="text-sm text-gray-700">{formatDate(r.orderDate)}</p>,
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
        let sup = r.supplier
        if (!sup && r.supplierName) sup = suppliers.find(x => x.name === r.supplierName)
        return sup?.id
          ? <a href={`/suppliers?highlight=${sup.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{sup.name}</a>
          : <p className="text-sm text-gray-700 truncate">{r.supplierName || '-'}</p>
      },
    },
    {
      key: 'payment', header: 'Typ platby',
      filterNode: <FilterSelect className="w-full" value={v['payment'] ?? PAYMENT_OPTIONS[0].value} onChange={val => s('payment', val)} options={PAYMENT_OPTIONS} />,
      render: r => <p className="text-sm text-gray-700">{PAYMENT_LABELS[r.invoice?.paymentType ?? ''] || '-'}</p>,
    },
    {
      key: 'items', header: 'Položek',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minItems'] ?? ''} onChange={val => s('minItems', val)} placeholder="≥" />,
      render: r => <p className="text-sm text-gray-600">{r.items.length}</p>,
    },
    {
      key: 'value', header: 'Hodnota',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minValue'] ?? ''} onChange={val => s('minValue', val)} placeholder="≥ Kč" />,
      render: r => (
        <p className="text-sm font-bold text-gray-900">
          {formatPrice(r.items.reduce((sum, item) => {
            const up     = Number(item.expectedPrice || 0)
            const vr     = Number(item.vatRate || 21)
            const nonVat = isNonVatPayer(vr)
            return sum + Number(item.quantity) * (isVatPayer ? up + (nonVat ? 0 : up * vr / 100) : up)
          }, 0))}
        </p>
      ),
    },
    {
      key: 'status', header: 'Status',
      filterNode: <FilterSelect className="w-full" value={v['status'] ?? STATUS_OPTIONS[0].value} onChange={val => s('status', val)} options={STATUS_OPTIONS} />,
      render: r => <PurchaseOrderStatusBadge status={r.status} />,
    },
  ]
}
