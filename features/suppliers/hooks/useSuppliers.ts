'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import { fetchSuppliers } from '../services/supplierService'
import type { Supplier } from '../types'

export function useSuppliers() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const filters = useFilters<Supplier>([
    { key: 'name',    type: 'text', placeholder: 'Název...',   match: (r, v) => r.name.toLowerCase().includes(v.toLowerCase()) },
    { key: 'contact', type: 'text', placeholder: 'Kontakt...',  match: (r, v) => (r.contact || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'email',   type: 'text', placeholder: 'Email...',    match: (r, v) => (r.email   || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'phone',   type: 'text', placeholder: 'Telefon...',  match: (r, v) => (r.phone   || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'website', type: 'text', placeholder: 'Web...',      match: (r, v) => (r.website || '').toLowerCase().includes(v.toLowerCase()) },
  ], () => resetPage.current())

  const ep = useEntityPage<Supplier>({
    fetchData:  fetchSuppliers,
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  return { ep, filters }
}
