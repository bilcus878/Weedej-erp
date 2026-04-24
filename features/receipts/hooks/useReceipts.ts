'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import type { SelectOption } from '@/components/erp'
import { fetchReceipts } from '../services/receiptService'
import type { Receipt } from '../types'

const statusOptions: SelectOption[] = [
  { value: 'all',      label: 'Vše' },
  { value: 'received', label: 'Přijato', className: 'text-green-600' },
  { value: 'storno',   label: 'Storno',  className: 'text-red-600'   },
]

export function useReceipts() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const filters = useFilters<Receipt>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',    match: (r, v) => r.receiptNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                 match: (r, v) => new Date(r.receiptDate).toISOString().split('T')[0] === v },
    { key: 'supplier', type: 'text',   placeholder: 'Dodavatel...', match: (r, v) => (r.purchaseOrder?.supplier?.name || r.supplier?.name || r.supplierName || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'minItems', type: 'number', placeholder: '≥',            match: (r, v) => (r.items?.length || 0) >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',            match: (r, v) => r.items.reduce((s, i) => s + Number(i.receivedQuantity || i.quantity) * Number(i.purchasePrice || 0), 0) >= v },
    { key: 'status',   type: 'select', options: statusOptions,       match: (r, v) => {
      if (v === 'all')      return true
      if (v === 'received') return r.status !== 'storno' && r.status !== 'cancelled'
      if (v === 'storno')   return r.status === 'storno' || r.status === 'cancelled'
      return r.status === v
    }},
  ], () => resetPage.current())

  const ep = useEntityPage<Receipt>({
    fetchData:  fetchReceipts,
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  return { ep, filters }
}
