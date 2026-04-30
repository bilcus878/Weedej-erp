'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import { fetchReturns } from '../services/returnService'
import type { ReturnRequestListItem } from '../types'

import type { SelectOption } from '@/components/erp/table/ColumnDef'

const statusOptions: SelectOption[] = [
  { value: 'all',               label: 'Vše' },
  { value: 'submitted',         label: 'Podáno',              className: 'text-blue-600'   },
  { value: 'under_review',      label: 'Ve zpracování',        className: 'text-indigo-600' },
  { value: 'waiting_for_goods', label: 'Čeká na zboží',        className: 'text-amber-600'  },
  { value: 'goods_received',    label: 'Zboží přijato',        className: 'text-cyan-600'   },
  { value: 'inspecting',        label: 'Kontrola',             className: 'text-orange-600' },
  { value: 'approved',          label: 'Schváleno',            className: 'text-green-600'  },
  { value: 'partially_approved',label: 'Částečně schváleno',   className: 'text-lime-600'   },
  { value: 'rejected',          label: 'Zamítnuto',            className: 'text-red-600'    },
  { value: 'resolved',          label: 'Vyřešeno',             className: 'text-teal-600'   },
  { value: 'closed',            label: 'Uzavřeno',             className: 'text-gray-400'   },
  { value: 'cancelled',         label: 'Zrušeno',              className: 'text-gray-400'   },
]

const typeOptions: SelectOption[] = [
  { value: 'all',            label: 'Vše'                  },
  { value: 'return',         label: 'Vrácení'              },
  { value: 'warranty_claim', label: 'Záruční reklamace'    },
  { value: 'complaint',      label: 'Stížnost'             },
  { value: 'exchange',       label: 'Výměna'               },
]

export function useReturns() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const filters = useFilters<ReturnRequestListItem>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',      match: (r, v) => r.returnNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'customer', type: 'text',   placeholder: 'Zákazník...',   match: (r, v) => (r.customerName ?? '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'order',    type: 'text',   placeholder: 'Objednávka...', match: (r, v) => (r.customerOrderNumber ?? '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'status',   type: 'select', options: statusOptions,       match: (r, v) => v === 'all' || r.status === v },
    { key: 'type',     type: 'select', options: typeOptions,         match: (r, v) => v === 'all' || r.type   === v },
  ], () => resetPage.current())

  const ep = useEntityPage<ReturnRequestListItem>({
    fetchData: fetchReturns,
    getRowId:  r => r.id,
    filterFn:  filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  return { ep, filters }
}
