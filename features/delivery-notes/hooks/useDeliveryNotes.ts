'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import type { SelectOption } from '@/components/erp'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { calcPackCount } from '@/lib/packQuantity'
import { fetchDeliveryNotes } from '../services/deliveryNoteService'
import type { DeliveryNote } from '../types'

const statusOptions: SelectOption[] = [
  { value: 'all',       label: 'Vše' },
  { value: 'delivered', label: 'Vydáno',  className: 'text-green-600' },
  { value: 'storno',    label: 'STORNO',  className: 'text-red-600'   },
]

export function useDeliveryNotes() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const filters = useFilters<DeliveryNote>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',    match: (r, v) => r.deliveryNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                 match: (r, v) => new Date(r.deliveryDate).toISOString().split('T')[0] === v },
    { key: 'customer', type: 'text',   placeholder: 'Odběratel...', match: (r, v) => (r.customer?.name || r.customerName || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'minItems', type: 'number', placeholder: '≥',            match: (r, v) => (r.items?.length || 0) >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',            match: (r, v) => {
      const total = r.items.reduce((sum, item) => {
        const hasSaved    = item.price != null && item.priceWithVat != null
        const unitPrice   = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
        const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
        const nonVat      = isNonVatPayer(itemVatRate)
        const vatPer      = hasSaved ? Number(item.vatAmount ?? 0) : (nonVat ? 0 : unitPrice * itemVatRate / 100)
        const withVat     = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPer)
        const packs       = calcPackCount(Number(item.quantity), item.productName, item.unit)
        return sum + packs * withVat
      }, 0)
      return total >= v
    }},
    { key: 'status', type: 'select', options: statusOptions, match: (r, v) => {
      if (v === 'all')       return true
      if (v === 'delivered') return r.status !== 'storno'
      if (v === 'storno')    return r.status === 'storno'
      return r.status === v
    }},
  ], () => resetPage.current())

  const ep = useEntityPage<DeliveryNote>({
    fetchData:  fetchDeliveryNotes,
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  return { ep, filters }
}
