'use client'

import { useState, useCallback } from 'react'
import { buildPreset }           from '@/lib/analytics/dateRange'
import { analyticsService }      from '../services/analyticsService'
import type { AnalyticsFilters } from '../types'
import type {
  OverviewReport, SalesReport, CustomersReport,
  ProductsReport, FinancialReport, OperationsReport,
} from '../types'

function defaultFilters(): AnalyticsFilters {
  const range = buildPreset('last30')
  return {
    preset:  'last30',
    from:    range.from.toISOString().slice(0, 10),
    to:      range.to.toISOString().slice(0, 10),
    compare: 'none',
  }
}

export interface AnalyticsState {
  filters:    AnalyticsFilters
  loading:    Record<string, boolean>
  error:      Record<string, string | null>
  overview:   OverviewReport   | null
  sales:      SalesReport      | null
  customers:  CustomersReport  | null
  products:   ProductsReport   | null
  financial:  FinancialReport  | null
  operations: OperationsReport | null
}

type Section = 'overview' | 'sales' | 'customers' | 'products' | 'financial' | 'operations'

export function useAnalytics() {
  const [filters,    setFilters]    = useState<AnalyticsFilters>(defaultFilters)
  const [loading,    setLoading]    = useState<Record<string, boolean>>({})
  const [error,      setError]      = useState<Record<string, string | null>>({})
  const [overview,   setOverview]   = useState<OverviewReport   | null>(null)
  const [sales,      setSales]      = useState<SalesReport      | null>(null)
  const [customers,  setCustomers]  = useState<CustomersReport  | null>(null)
  const [products,   setProducts]   = useState<ProductsReport   | null>(null)
  const [financial,  setFinancial]  = useState<FinancialReport  | null>(null)
  const [operations, setOperations] = useState<OperationsReport | null>(null)

  const fetchSection = useCallback(async (section: Section, f: AnalyticsFilters) => {
    setLoading(prev => ({ ...prev, [section]: true }))
    setError(prev   => ({ ...prev, [section]: null }))
    try {
      const data = await (analyticsService as any)[section](f)
      switch (section) {
        case 'overview':   setOverview(data);   break
        case 'sales':      setSales(data);      break
        case 'customers':  setCustomers(data);  break
        case 'products':   setProducts(data);   break
        case 'financial':  setFinancial(data);  break
        case 'operations': setOperations(data); break
      }
    } catch (e: any) {
      setError(prev => ({ ...prev, [section]: e.message ?? 'Chyba načítání' }))
    } finally {
      setLoading(prev => ({ ...prev, [section]: false }))
    }
  }, [])

  const fetchAll = useCallback((f: AnalyticsFilters) => {
    const sections: Section[] = ['overview', 'sales', 'customers', 'products', 'financial', 'operations']
    sections.forEach(s => fetchSection(s, f))
  }, [fetchSection])

  const applyFilters = useCallback((next: Partial<AnalyticsFilters>) => {
    setFilters(prev => {
      const merged = { ...prev, ...next }
      fetchAll(merged)
      return merged
    })
  }, [fetchAll])

  const refresh = useCallback(() => fetchAll(filters), [fetchAll, filters])

  return {
    filters, applyFilters, refresh,
    loading, error,
    overview, sales, customers, products, financial, operations,
    fetchSection: (section: Section) => fetchSection(section, filters),
  }
}
