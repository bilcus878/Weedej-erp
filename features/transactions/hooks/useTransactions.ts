'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import type { SelectOption } from '@/components/erp'
import { fetchTransactions } from '../services/transactionService'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
import type { Transaction } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',       label: 'Vše'       },
  { value: 'completed', label: 'Dokončeno', className: 'text-green-600'  },
  { value: 'pending',   label: 'Čeká',      className: 'text-yellow-600' },
  { value: 'storno',    label: 'Storno',    className: 'text-red-600'    },
]

export function useTransactions() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const filters = useFilters<Transaction>([
    { key: 'code',       type: 'text',   placeholder: 'SUP...',   match: (r, v) => r.transactionCode.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',       type: 'date',                             match: (r, v) => new Date(r.transactionDate).toISOString().split('T')[0] === v },
    { key: 'sumupCode',  type: 'text',   placeholder: 'MS9W...',  match: (r, v) => (r.sumupTransactionCode || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'payment',    type: 'select', options: PAYMENT_OPTIONS, match: (r, v) => v === 'all' ? true : v === 'none' ? !r.paymentType : r.paymentType === v },
    { key: 'itemsCount', type: 'number', placeholder: '=',        match: (r, v) => r.items.length === v },
    { key: 'minValue',   type: 'number', placeholder: '≥',        match: (r, v) => r.totalAmount >= v },
    { key: 'status',     type: 'select', options: STATUS_OPTIONS,  match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<Transaction>({
    fetchData:  fetchTransactions,
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })

  resetPage.current = () => ep.setPage(1)

  return { ep, filters }
}
