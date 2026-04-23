'use client'

import { useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import type { SelectOption } from '@/components/erp'
import { fetchReceivedInvoices, fetchSuppliers } from '../services/receivedInvoiceService'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
import type { ReceivedInvoice, Supplier } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',                label: 'Vše'                                        },
  { value: 'pending',            label: 'Čeká',       className: 'text-yellow-600'  },
  { value: 'partially_received', label: 'Částečně',   className: 'text-orange-600'  },
  { value: 'received',           label: 'Přijato',    className: 'text-green-600'   },
  { value: 'storno',             label: 'STORNO',     className: 'text-red-600'     },
]

export function useReceivedInvoices() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const filters = useFilters<ReceivedInvoice>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',
      match: (r, v) => r.invoiceNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',
      match: (r, v) => new Date(r.invoiceDate).toISOString().split('T')[0] === v },
    { key: 'supplier', type: 'text',   placeholder: 'Dodavatel...',
      match: (r, v) => {
        const sup = r.receipts?.[0]?.supplier || r.purchaseOrder?.supplier
        return (sup?.name || r.supplierName || r.purchaseOrder?.supplierName || '').toLowerCase().includes(v.toLowerCase())
      }},
    { key: 'payment',  type: 'select', options: PAYMENT_OPTIONS,
      match: (r, v) => v === 'all' ? true : v === 'none' ? !r.paymentType : r.paymentType === v },
    { key: 'minItems', type: 'number', placeholder: '≥',
      match: (r, v) => (r.purchaseOrder?.items?.length || r.receipts?.reduce((s, rc) => s + (rc.items?.length || 0), 0) || 0) >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',
      match: (r, v) => r.totalAmount >= v },
    { key: 'status',   type: 'select', options: STATUS_OPTIONS,
      match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<ReceivedInvoice>({
    fetchData: async () => {
      const [invoices, sups] = await Promise.all([fetchReceivedInvoices(), fetchSuppliers()])
      setSuppliers(sups)
      return invoices
    },
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })

  resetPage.current = () => ep.setPage(1)

  return { ep, filters, suppliers }
}
