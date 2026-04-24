'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import { fetchIssuedInvoices } from '../services/issuedInvoiceService'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
import type { IssuedInvoice } from '../types'

const STATUS_OPTIONS = [
  { value: 'all',        label: 'Vše'         },
  { value: 'new',        label: 'Nová'        },
  { value: 'paid',       label: 'Zaplacená'   },
  { value: 'processing', label: 'Připravuje se' },
  { value: 'shipped',    label: 'Odesláno'    },
  { value: 'delivered',  label: 'Předáno'     },
  { value: 'cancelled',  label: 'Zrušená'     },
  { value: 'storno',     label: 'STORNO'      },
]

export function useIssuedInvoices() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const filters = useFilters<IssuedInvoice>([
    {
      key: 'number',   type: 'text',   placeholder: 'Číslo...',
      match: (r, v) => r.transactionCode.toLowerCase().includes(v.toLowerCase()),
    },
    {
      key: 'date',     type: 'date',
      match: (r, v) => new Date(r.transactionDate).toISOString().split('T')[0] === v,
    },
    {
      key: 'customer', type: 'text',   placeholder: 'Odběratel...',
      match: (r, v) => (r.customerName || r.customer?.name || '').toLowerCase().includes(v.toLowerCase()),
    },
    {
      key: 'payment',  type: 'select', options: PAYMENT_OPTIONS,
      match: (r, v) => v === 'all' ? true : v === 'none' ? !r.paymentType : r.paymentType === v,
    },
    {
      key: 'minItems', type: 'number', placeholder: '≥',
      match: (r, v) => (r.items?.length || 0) >= v,
    },
    {
      key: 'minValue', type: 'number', placeholder: '≥',
      match: (r, v) => r.totalAmount >= v,
    },
    {
      key: 'status',   type: 'select', options: STATUS_OPTIONS,
      match: (r, v) => v === 'all' || r.status === v,
    },
  ], () => resetPage.current())

  const ep = useEntityPage<IssuedInvoice>({
    fetchData:  fetchIssuedInvoices,
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })

  resetPage.current = () => ep.setPage(1)

  return { ep, filters }
}
