import type { DatePreset } from '@/lib/analytics/dateRange'
import type { ComparisonValue, TimeSeriesPoint } from '@/lib/analytics/comparisonEngine'

// ── Filter state ──────────────────────────────────────────────────────────────

export interface AnalyticsFilters {
  preset:     DatePreset
  from:       string   // ISO date string "yyyy-MM-dd"
  to:         string
  compare:    'previous_period' | 'year_ago' | 'none'
}

// ── KPI ───────────────────────────────────────────────────────────────────────

export interface KpiMetric {
  label:      string
  value:      number
  formatted:  string
  comparison?: ComparisonValue
  prefix?:    string
  suffix?:    string
}

// ── Overview ──────────────────────────────────────────────────────────────────

export interface OverviewReport {
  revenue:       KpiMetric
  orders:        KpiMetric
  avgOrderValue: KpiMetric
  newCustomers:  KpiMetric
  convRate?:     KpiMetric
  revenueChart:  TimeSeriesPoint[]
  ordersChart:   TimeSeriesPoint[]
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export interface SalesReport {
  revenue:       KpiMetric
  orders:        KpiMetric
  avgOrderValue: KpiMetric
  revenueChart:  TimeSeriesPoint[]
  ordersChart:   TimeSeriesPoint[]
  byStatus:      { status: string; count: number; revenue: number }[]
  bySource:      { source: string; count: number; revenue: number }[]
  topCustomers:  { name: string; orderCount: number; revenue: number }[]
}

// ── Customers ─────────────────────────────────────────────────────────────────

export interface CustomersReport {
  total:        KpiMetric
  newInPeriod:  KpiMetric
  returning:    KpiMetric
  avgLtv:       KpiMetric
  retentionRate: KpiMetric
  newByDay:     TimeSeriesPoint[]
  topByRevenue: { name: string; orderCount: number; revenue: number; lastOrder: string }[]
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductsReport {
  totalSold:     KpiMetric
  uniqueProducts: KpiMetric
  topByRevenue:  { productName: string; quantity: number; revenue: number }[]
  topByQty:      { productName: string; quantity: number; revenue: number }[]
  categoryBreakdown: { category: string; revenue: number; quantity: number }[]
}

// ── Financial ─────────────────────────────────────────────────────────────────

export interface FinancialReport {
  cashRevenue:    KpiMetric
  accrualRevenue: KpiMetric
  cashVsCard:     { cash: number; card: number }
  invoicesByStatus: { status: string; count: number; amount: number }[]
  overdueAmount:  KpiMetric
  revenueByDay:   TimeSeriesPoint[]
}

// ── Operations ────────────────────────────────────────────────────────────────

export interface OperationsReport {
  pendingOrders:   KpiMetric
  avgFulfillmentH: KpiMetric
  shippedInPeriod: KpiMetric
  cancelledOrders: KpiMetric
  ordersByStatus:  { status: string; count: number }[]
  fulfillmentChart: TimeSeriesPoint[]
}
