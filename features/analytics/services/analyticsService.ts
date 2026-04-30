import type { AnalyticsFilters }  from '../types'
import type { OverviewReport, SalesReport, CustomersReport, ProductsReport, FinancialReport, OperationsReport } from '../types'

function buildQs(filters: AnalyticsFilters): string {
  const p = new URLSearchParams({
    preset:  filters.preset,
    from:    filters.from,
    to:      filters.to,
    compare: filters.compare,
  })
  return p.toString()
}

async function get<T>(path: string, filters: AnalyticsFilters): Promise<T> {
  const res = await fetch(`${path}?${buildQs(filters)}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const analyticsService = {
  overview:   (f: AnalyticsFilters) => get<OverviewReport>   ('/api/reports/overview',   f),
  sales:      (f: AnalyticsFilters) => get<SalesReport>      ('/api/reports/sales',      f),
  customers:  (f: AnalyticsFilters) => get<CustomersReport>  ('/api/reports/customers',  f),
  products:   (f: AnalyticsFilters) => get<ProductsReport>   ('/api/reports/products',   f),
  financial:  (f: AnalyticsFilters) => get<FinancialReport>  ('/api/reports/financial',  f),
  operations: (f: AnalyticsFilters) => get<OperationsReport> ('/api/reports/operations', f),

  exportUrl(section: string, filters: AnalyticsFilters, format: 'csv' | 'excel' | 'pdf'): string {
    const p = new URLSearchParams({
      preset:  filters.preset,
      from:    filters.from,
      to:      filters.to,
      compare: filters.compare,
      export:  format,
    })
    return `/api/reports/${section}?${p.toString()}`
  },
}
