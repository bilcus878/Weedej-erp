'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { CustomerOrder } from '../types'

export interface OrderFilters {
  search:   string  // matches orderNumber OR customer name
  status:   string
  dateFrom: string
  dateTo:   string
  payment:  string
  minValue: string
}

const ALL_KEYS:      (keyof OrderFilters)[] = ['search', 'status', 'dateFrom', 'dateTo', 'payment', 'minValue']
const ADVANCED_KEYS: (keyof OrderFilters)[] = ['search', 'dateFrom', 'dateTo', 'payment', 'minValue']

export function useOrderFilters() {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const filters = useMemo<OrderFilters>(() => ({
    search:   params.get('search')   ?? '',
    status:   params.get('status')   ?? '',
    dateFrom: params.get('dateFrom') ?? '',
    dateTo:   params.get('dateTo')   ?? '',
    payment:  params.get('payment')  ?? '',
    minValue: params.get('minValue') ?? '',
  }), [params])

  // Total active filter count (all keys including status)
  const activeCount   = useMemo(() => ALL_KEYS.filter(k => !!filters[k]).length, [filters])
  // Count for drawer/bar badge — excludes status since tabs already communicate it
  const advancedCount = useMemo(() => ADVANCED_KEYS.filter(k => !!filters[k]).length, [filters])

  const setFilter = useCallback((key: keyof OrderFilters, value: string) => {
    const next = new URLSearchParams(params.toString())
    value ? next.set(key, value) : next.delete(key)
    next.delete('highlight')
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [params, pathname, router])

  // Clears everything including status
  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  return { filters, setFilter, clearFilters, activeCount, advancedCount }
}

// Pure filter function — no side effects, fully testable in isolation.
export function applyOrderFilters(order: CustomerOrder, f: OrderFilters): boolean {
  if (f.status && order.status !== f.status) return false

  if (f.search) {
    const q  = f.search.toLowerCase()
    const ok = order.orderNumber.toLowerCase().includes(q) ||
      (order.customer?.name ?? order.customerName ?? '').toLowerCase().includes(q)
    if (!ok) return false
  }

  if (f.dateFrom && new Date(order.orderDate) < new Date(f.dateFrom)) return false
  if (f.dateTo) {
    const to = new Date(f.dateTo)
    to.setHours(23, 59, 59, 999)
    if (new Date(order.orderDate) > to) return false
  }

  if (f.payment && f.payment !== 'all') {
    const payType = order.issuedInvoice?.paymentType
    if (f.payment === 'none' && payType)               return false
    if (f.payment !== 'none' && payType !== f.payment) return false
  }

  if (f.minValue) {
    const min = parseFloat(f.minValue)
    if (!isNaN(min) && order.totalAmount < min) return false
  }

  return true
}
