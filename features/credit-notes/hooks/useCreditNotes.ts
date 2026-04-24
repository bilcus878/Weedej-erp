'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import type { SelectOption } from '@/components/erp'
import { fetchCreditNotes } from '../services/creditNoteService'
import type { CreditNote } from '../types'

const statusOptions: SelectOption[] = [
  { value: 'all',    label: 'Vše' },
  { value: 'active', label: 'Aktivní', className: 'text-purple-600' },
  { value: 'storno', label: 'STORNO',  className: 'text-red-600'    },
]

export function useCreditNotes() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const filters = useFilters<CreditNote>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',    match: (r, v) => r.creditNoteNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                match: (r, v) => new Date(r.creditNoteDate).toISOString().split('T')[0] === v },
    { key: 'customer', type: 'text',   placeholder: 'Odběratel...', match: (r, v) => (r.customer?.name || r.customerName || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'invoice',  type: 'text',   placeholder: 'Faktura...',  match: (r, v) => r.invoiceNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'minItems', type: 'number', placeholder: '≥',           match: (r, v) => (r.items?.length || 0) >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',           match: (r, v) => Math.abs(r.totalAmount) >= v },
    { key: 'status',   type: 'select', options: statusOptions,      match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<CreditNote>({
    fetchData:  fetchCreditNotes,
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  return { ep, filters }
}
