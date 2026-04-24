'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import { fetchCustomers } from '../services/customerService'
import type { Customer } from '../types'

export function useCustomers() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const filters = useFilters<Customer>([
    { key: 'name',    type: 'text', placeholder: 'Název...',   match: (r, v) => r.name.toLowerCase().includes(v.toLowerCase()) },
    { key: 'contact', type: 'text', placeholder: 'Kontakt...',  match: (r, v) => (r.contact || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'email',   type: 'text', placeholder: 'Email...',    match: (r, v) => (r.email   || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'phone',   type: 'text', placeholder: 'Telefon...',  match: (r, v) => (r.phone   || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'web',     type: 'text', placeholder: 'Web...',      match: (r, v) => (r.website || '').toLowerCase().includes(v.toLowerCase()) },
  ], () => resetPage.current())

  const ep = useEntityPage<Customer>({
    fetchData:  fetchCustomers,
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  return { ep, filters }
}
