'use client'

import { useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import type { SelectOption } from '@/components/erp'
import { fetchPurchaseOrders, fetchSuppliers, fetchProducts } from '../services/purchaseOrderService'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
import type { PurchaseOrder, Supplier, Product } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',                label: 'Vše'                                        },
  { value: 'pending',            label: 'Čeká',       className: 'text-yellow-600'  },
  { value: 'confirmed',          label: 'Potvrzena',  className: 'text-blue-600'    },
  { value: 'partially_received', label: 'Částečně',   className: 'text-orange-600'  },
  { value: 'received',           label: 'Přijata',    className: 'text-green-600'   },
  { value: 'storno',             label: 'Storno',     className: 'text-red-600'     },
]

export function usePurchaseOrders() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products,  setProducts]  = useState<Product[]>([])

  const filters = useFilters<PurchaseOrder>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',
      match: (r, v) => r.orderNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',
      match: (r, v) => new Date(r.orderDate).toISOString().split('T')[0] === v },
    { key: 'supplier', type: 'text',   placeholder: 'Dodavatel...',
      match: (r, v) => (r.supplier?.name || r.supplierName || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'payment',  type: 'select', options: PAYMENT_OPTIONS,
      match: (r, v) => { if (v === 'all') return true; const pt = r.invoice?.paymentType; return v === 'none' ? !pt : pt === v } },
    { key: 'minItems', type: 'number', placeholder: '≥',
      match: (r, v) => r.items.length >= v },
    { key: 'minValue', type: 'number', placeholder: '≥ Kč',
      match: (r, v) => r.items.reduce((s, i) => s + Number(i.quantity) * Number(i.expectedPrice || 0), 0) >= v },
    { key: 'status',   type: 'select', options: STATUS_OPTIONS,
      match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<PurchaseOrder>({
    fetchData: async () => {
      const [orders, sups, prods] = await Promise.all([fetchPurchaseOrders(), fetchSuppliers(), fetchProducts()])
      setSuppliers(Array.isArray(sups)  ? sups  : [])
      setProducts(Array.isArray(prods) ? prods : [])
      return orders
    },
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })

  resetPage.current = () => ep.setPage(1)

  return { ep, filters, suppliers, products }
}
