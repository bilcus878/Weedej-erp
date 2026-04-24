'use client'

import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect, FilterCombobox } from '@/components/erp'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
import type { ReceivedInvoice, Supplier } from '../types'
import { ReceivedInvoiceStatusBadge } from './ReceivedInvoiceStatusBadge'

const PAYMENT_LABELS: Record<string, string> = { cash: 'Hotovost', card: 'Karta', transfer: 'Převod' }

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',                label: 'Vše'                                       },
  { value: 'pending',            label: 'Čeká',     className: 'text-yellow-600'   },
  { value: 'partially_received', label: 'Částečně', className: 'text-orange-600'   },
  { value: 'received',           label: 'Přijato',  className: 'text-green-600'    },
  { value: 'storno',             label: 'STORNO',   className: 'text-red-600'      },
]

export function createReceivedInvoiceColumns(
  filters: FiltersResult<ReceivedInvoice>,
  suppliers: Supplier[],
  supplierSuggestions: string[] = [],
): ColumnDef<ReceivedInvoice>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'number', header: 'Číslo',
      filterNode: <FilterInput className="w-full text-center" value={v['number'] ?? ''} onChange={val => s('number', val)} placeholder="Číslo..." />,
      render: r => (
        <div>
          <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
            {r.invoiceNumber}
          </p>
          {r.isTemporary && r.status !== 'storno' && (
            <p className="text-xs text-orange-600 mt-0.5">Doplň údaje o faktuře</p>
          )}
        </div>
      ),
    },
    {
      key: 'date', header: 'Datum',
      filterNode: <FilterInput className="w-full text-center" type="date" value={v['date'] ?? ''} onChange={val => s('date', val)} />,
      render: r => <p className="text-sm text-gray-700">{new Date(r.invoiceDate).toLocaleDateString('cs-CZ')}</p>,
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
        let supplier = r.receipts?.[0]?.supplier || r.purchaseOrder?.supplier
        if (!supplier && r.supplierName) supplier = suppliers.find(s => s.name === r.supplierName)
        if (supplier?.id) return (
          <a href={`/suppliers?highlight=${supplier.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>
            {supplier.name}
          </a>
        )
        return <p className="text-sm text-gray-700 truncate">{r.supplierName || r.purchaseOrder?.supplierName || '-'}</p>
      },
    },
    {
      key: 'payment', header: 'Typ platby',
      filterNode: <FilterSelect className="w-full" value={v['payment'] ?? PAYMENT_OPTIONS[0].value} onChange={val => s('payment', val)} options={PAYMENT_OPTIONS} />,
      render: r => <p className="text-sm text-gray-700">{PAYMENT_LABELS[r.paymentType] || '-'}</p>,
    },
    {
      key: 'items', header: 'Položek',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minItems'] ?? ''} onChange={val => s('minItems', val)} placeholder="≥" />,
      render: r => {
        const count = r.purchaseOrder?.items?.length
          || r.receipts?.reduce((s, rc) => s + (rc.items?.length || 0), 0)
          || 0
        return <p className="text-sm text-gray-600">{count}</p>
      },
    },
    {
      key: 'value', header: 'Hodnota',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minValue'] ?? ''} onChange={val => s('minValue', val)} placeholder="≥" />,
      render: r => <p className="text-sm font-bold text-gray-900">{Number(r.totalAmount).toLocaleString('cs-CZ')} Kč</p>,
    },
    {
      key: 'status', header: 'Status',
      filterNode: <FilterSelect className="w-full" value={v['status'] ?? STATUS_OPTIONS[0].value} onChange={val => s('status', val)} options={STATUS_OPTIONS} />,
      render: r => <ReceivedInvoiceStatusBadge status={r.status || 'pending'} />,
    },
  ]
}
