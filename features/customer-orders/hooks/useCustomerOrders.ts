'use client'

import { useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import type { SelectOption } from '@/components/erp'
import { PAYMENT_OPTIONS } from '@/lib/constants/paymentOptions'
import { fetchCustomerOrders, fetchCustomers, fetchProducts } from '../services/customerOrderService'
import type { CustomerOrder, Customer, Product } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',        label: 'Vše'                                           },
  { value: 'new',        label: 'Nová',          className: 'text-yellow-600'   },
  { value: 'paid',       label: 'Zaplacená',     className: 'text-green-600'    },
  { value: 'processing', label: 'Připravuje se', className: 'text-blue-600'     },
  { value: 'shipped',    label: 'Odeslaná',      className: 'text-purple-600'   },
  { value: 'delivered',  label: 'Doručená',      className: 'text-teal-600'     },
  { value: 'cancelled',  label: 'Zrušená',       className: 'text-red-600'      },
]

export function useCustomerOrders() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products,  setProducts]  = useState<Product[]>([])

  const filters = useFilters<CustomerOrder>([
    { key: 'number',   type: 'text',   placeholder: 'OBJ...',      match: (r, v) => r.orderNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                match: (r, v) => new Date(r.orderDate).toISOString().split('T')[0] === v },
    { key: 'customer', type: 'text',   placeholder: 'Odběratel...', match: (r, v) => (r.customer?.name || r.customerName || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'payment',  type: 'select', options: PAYMENT_OPTIONS,    match: (r, v) => v === 'all' ? true : v === 'none' ? !r.issuedInvoice?.paymentType : r.issuedInvoice?.paymentType === v },
    { key: 'minItems', type: 'number', placeholder: '≥',            match: (r, v) => r.items.length >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',            match: (r, v) => r.totalAmount >= v },
    { key: 'status',   type: 'select', options: STATUS_OPTIONS,     match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<CustomerOrder>({
    fetchData: async () => {
      const [orders, cust, prods] = await Promise.all([
        fetchCustomerOrders(),
        fetchCustomers(),
        fetchProducts(),
      ])
      setCustomers(cust)
      setProducts(prods)
      return orders
    },
    getRowId:   r => r.id,
    filterFn:   filters.fn,
    highlightId,
  })

  resetPage.current = () => ep.setPage(1)

  return { ep, filters, customers, products }
}
