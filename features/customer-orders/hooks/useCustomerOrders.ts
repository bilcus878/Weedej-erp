'use client'

import { useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage } from '@/components/erp'
import { fetchCustomerOrders, fetchCustomers, fetchProducts } from '../services/customerOrderService'
import type { CustomerOrder, Customer, Product } from '../types'
import { useOrderFilters, applyOrderFilters } from './useOrderFilters'

export function useCustomerOrders() {
  const highlightId = useSearchParams().get('highlight')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products,  setProducts]  = useState<Product[]>([])

  const { filters, setFilter, clearFilters, activeCount, advancedCount } = useOrderFilters()

  // Stable ref so filterFn always reads latest URL params without recreating useEntityPage
  const filtersRef = useRef(filters)
  filtersRef.current = filters

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
    getRowId: r => r.id,
    // Second arg is useEntityPage's internal filter state — always {}, intentionally ignored.
    // We read from filtersRef which tracks URL params on every render.
    filterFn: (row, _) => applyOrderFilters(row, filtersRef.current),
    highlightId,
  })

  // Reset to page 1 whenever any filter value changes
  const setPageRef = useRef(ep.setPage)
  setPageRef.current = ep.setPage
  const { search, status, dateFrom, dateTo, payment, minValue } = filters
  useEffect(() => {
    setPageRef.current(1)
  }, [search, status, dateFrom, dateTo, payment, minValue]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ep, filters, setFilter, clearFilters, activeCount, advancedCount, customers, products }
}
