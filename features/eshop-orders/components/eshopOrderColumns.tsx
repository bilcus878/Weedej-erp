'use client'

import { formatDate, formatPrice } from '@/lib/utils'
import type { ColumnDef, SelectOption, FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect } from '@/components/erp'
import type { EshopOrder } from '../types'
import { EshopOrderStatusBadge } from './EshopOrderStatusBadge'
import { getCustomerName, getCustomerEmail } from '../domain/eshopOrderMapper'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',        label: 'Vše'                                         },
  { value: 'paid',       label: 'Zaplaceno',      className: 'text-yellow-700' },
  { value: 'processing', label: 'Část. odesláno', className: 'text-blue-700'   },
  { value: 'shipped',    label: 'Odesláno',        className: 'text-purple-700' },
  { value: 'delivered',  label: 'Doručeno',        className: 'text-green-700'  },
  { value: 'cancelled',  label: 'Zrušeno',         className: 'text-red-700'    },
]

export function createEshopOrderColumns(
  filters: FiltersResult<EshopOrder>,
  isVatPayer: boolean,
): ColumnDef<EshopOrder>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'number', header: 'Číslo',
      filterNode: <FilterInput className="w-full text-center" value={v['number'] ?? ''} onChange={val => s('number', val)} placeholder="ESH..." />,
      render: r => (
        <p className={`text-sm font-bold text-gray-700 ${['cancelled', 'storno'].includes(r.status) ? 'line-through' : ''}`}>
          {r.orderNumber}
        </p>
      ),
    },
    {
      key: 'date', header: 'Datum',
      filterNode: <FilterInput className="w-full text-center" type="date" value={v['date'] ?? ''} onChange={val => s('date', val)} />,
      render: r => (
        <>
          <p className="text-sm text-gray-900">{formatDate(r.orderDate)}</p>
          <p className="text-xs text-gray-400">
            {new Date(r.orderDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </>
      ),
    },
    {
      key: 'customer', header: 'Zákazník', width: '2fr',
      filterNode: <FilterInput className="w-full text-center" value={v['customer'] ?? ''} onChange={val => s('customer', val)} placeholder="Zákazník / email..." />,
      render: r => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{getCustomerName(r)}</p>
          {getCustomerEmail(r) && (
            <p className="text-xs text-gray-400 truncate">{getCustomerEmail(r)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'items', header: 'Položek',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minItems'] ?? ''} onChange={val => s('minItems', val)} placeholder="≥" />,
      render: r => <p className="text-sm text-gray-700">{r.items.length}</p>,
    },
    {
      key: 'amount', header: 'Hodnota',
      filterNode: <FilterInput className="w-full text-center" type="number" value={v['minValue'] ?? ''} onChange={val => s('minValue', val)} placeholder="≥" />,
      render: r => (
        <>
          <p className="text-sm font-bold text-gray-900">{formatPrice(Number(r.totalAmount))}</p>
          {isVatPayer && Number(r.totalVatAmount) > 0 && (
            <p className="text-xs text-gray-400">DPH: {formatPrice(Number(r.totalVatAmount))}</p>
          )}
        </>
      ),
    },
    {
      key: 'status', header: 'Status',
      filterNode: <FilterSelect className="w-full" value={v['status'] ?? STATUS_OPTIONS[0].value} onChange={val => s('status', val)} options={STATUS_OPTIONS} />,
      render: r => <EshopOrderStatusBadge status={r.status} />,
    },
  ]
}
