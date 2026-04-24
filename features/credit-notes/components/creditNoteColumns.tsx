'use client'

import { formatPrice } from '@/lib/utils'
import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect, FilterCombobox } from '@/components/erp'
import type { CreditNote } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',    label: 'Vše'                                    },
  { value: 'active', label: 'Aktivní', className: 'text-purple-600' },
  { value: 'storno', label: 'STORNO',  className: 'text-red-600'    },
]

export function createCreditNoteColumns(
  filters: FiltersResult<CreditNote>,
  customerSuggestions: string[] = [],
): ColumnDef<CreditNote>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'number', header: 'Číslo',
      filterNode: <FilterInput className="w-full text-center" value={v['number'] ?? ''} onChange={val => s('number', val)} placeholder="Číslo..." />,
      render: r => (
        <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
          {r.creditNoteNumber}
        </p>
      ),
    },
    {
      key: 'date', header: 'Datum',
      filterNode: <FilterInput className="w-full text-center" type="date" value={v['date'] ?? ''} onChange={val => s('date', val)} />,
      render: r => <p className="text-sm text-gray-700">{new Date(r.creditNoteDate).toLocaleDateString('cs-CZ')}</p>,
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
        : <p className="text-sm text-gray-700 truncate">{r.customerName || <em className="text-gray-400 not-italic">Bez odběratele</em>}</p>,
    },
    {
      key: 'invoice', header: 'Faktura',
      filterNode: <FilterInput className="w-full text-center" value={v['invoice'] ?? ''} onChange={val => s('invoice', val)} placeholder="Faktura..." />,
      render: r => (
        <a href={`/invoices/issued?highlight=${r.issuedInvoiceId}`} className="text-sm text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
          {r.invoiceNumber}
        </a>
      ),
    },
    {
      key: 'items', header: 'Položek',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minItems'] ?? ''} onChange={val => s('minItems', val)} placeholder="≥" />,
      render: r => <p className="text-sm text-gray-600">{r.items.length}</p>,
    },
    {
      key: 'value', header: 'Hodnota',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minValue'] ?? ''} onChange={val => s('minValue', val)} placeholder="≥" />,
      render: r => <p className="text-sm font-bold text-red-600">{formatPrice(r.totalAmount)}</p>,
    },
    {
      key: 'status', header: 'Status',
      filterNode: <FilterSelect className="w-full" value={v['status'] ?? STATUS_OPTIONS[0].value} onChange={val => s('status', val)} options={STATUS_OPTIONS} />,
      render: r => r.status === 'storno'
        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">STORNO</span>
        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Aktivní</span>,
    },
  ]
}
