'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import type { SelectOption } from '@/components/erp'
import { fetchEshopOrders } from '../services/eshopOrderService'
import { getCustomerName, getCustomerEmail } from '../domain/eshopOrderMapper'
import type { EshopOrder } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',        label: 'Vše'                                         },
  { value: 'paid',       label: 'Zaplaceno',      className: 'text-yellow-700' },
  { value: 'processing', label: 'Část. odesláno', className: 'text-blue-700'   },
  { value: 'shipped',    label: 'Odesláno',        className: 'text-purple-700' },
  { value: 'delivered',  label: 'Doručeno',        className: 'text-green-700'  },
  { value: 'cancelled',  label: 'Zrušeno',         className: 'text-red-700'    },
]

export function useEshopOrders() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const filters = useFilters<EshopOrder>([
    {
      key: 'number',   type: 'text',   placeholder: 'ESH...',
      match: (r, v) => r.orderNumber.toLowerCase().includes(v.toLowerCase()),
    },
    {
      key: 'date',     type: 'date',
      match: (r, v) => new Date(r.orderDate).toISOString().split('T')[0] === v,
    },
    {
      key: 'customer', type: 'text',   placeholder: 'Zákazník / email...',
      match: (r, v) => {
        const q = v.toLowerCase()
        return getCustomerName(r).toLowerCase().includes(q) || getCustomerEmail(r).toLowerCase().includes(q)
      },
    },
    { key: 'minItems', type: 'number', placeholder: '≥ položek', match: (r, v) => r.items.length >= v },
    { key: 'minValue', type: 'number', placeholder: '≥ Kč',      match: (r, v) => Number(r.totalAmount) >= v },
    { key: 'status',   type: 'select', options: STATUS_OPTIONS,   match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<EshopOrder>({
    fetchData:  fetchEshopOrders,
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })

  resetPage.current = () => ep.setPage(1)

  return { ep, filters }
}
