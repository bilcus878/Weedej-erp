import { prisma }      from '@/lib/prisma'
import { compare }     from '@/lib/analytics/comparisonEngine'
import { formatPrice } from '@/lib/utils'
import type { DateRange } from '@/lib/analytics/dateRange'
import type { SalesReport } from '../types'

interface SalesServiceParams {
  range:    DateRange
  prevRange?: DateRange
}

async function fetchSalesData(from: Date, to: Date) {
  const orders = await prisma.customerOrder.findMany({
    where: { orderDate: { gte: from, lte: to }, status: { not: 'storno' } },
    select: { id: true, orderDate: true, totalAmount: true, status: true, source: true, customerName: true, customerId: true },
    orderBy: { orderDate: 'asc' },
  })
  return orders
}

function buildDailyChart(orders: Awaited<ReturnType<typeof fetchSalesData>>, from: Date, to: Date) {
  const map: Record<string, { revenue: number; orders: number }> = {}
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    map[d.toISOString().slice(0, 10)] = { revenue: 0, orders: 0 }
  }
  for (const o of orders) {
    const key = new Date(o.orderDate).toISOString().slice(0, 10)
    if (map[key]) {
      map[key].revenue += Number(o.totalAmount)
      map[key].orders  += 1
    }
  }
  return {
    revenueChart: Object.entries(map).map(([date, v]) => ({ date, value: v.revenue })),
    ordersChart:  Object.entries(map).map(([date, v]) => ({ date, value: v.orders  })),
  }
}

export async function getSalesReport({ range, prevRange }: SalesServiceParams): Promise<SalesReport> {
  const [current, prev] = await Promise.all([
    fetchSalesData(range.from, range.to),
    prevRange ? fetchSalesData(prevRange.from, prevRange.to) : Promise.resolve(null),
  ])

  const revenue    = current.reduce((s, o) => s + Number(o.totalAmount), 0)
  const prevRev    = prev?.reduce((s, o) => s + Number(o.totalAmount), 0) ?? 0
  const orders     = current.length
  const prevOrders = prev?.length ?? 0
  const aov        = orders > 0 ? revenue / orders : 0
  const prevAov    = prevOrders > 0 ? prevRev / prevOrders : 0

  const byStatus = Object.entries(
    current.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
      const k = o.status
      if (!acc[k]) acc[k] = { count: 0, revenue: 0 }
      acc[k].count   += 1
      acc[k].revenue += Number(o.totalAmount)
      return acc
    }, {})
  ).map(([status, v]) => ({ status, ...v })).sort((a, b) => b.revenue - a.revenue)

  const bySource = Object.entries(
    current.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
      const k = o.source ?? 'internal'
      if (!acc[k]) acc[k] = { count: 0, revenue: 0 }
      acc[k].count   += 1
      acc[k].revenue += Number(o.totalAmount)
      return acc
    }, {})
  ).map(([source, v]) => ({ source, ...v })).sort((a, b) => b.revenue - a.revenue)

  const customerMap = current.reduce<Record<string, { name: string; orderCount: number; revenue: number }>>((acc, o) => {
    const k = o.customerId ?? o.customerName ?? 'Neznámý'
    if (!acc[k]) acc[k] = { name: o.customerName ?? 'Neznámý', orderCount: 0, revenue: 0 }
    acc[k].orderCount += 1
    acc[k].revenue    += Number(o.totalAmount)
    return acc
  }, {})
  const topCustomers = Object.values(customerMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  const { revenueChart, ordersChart } = buildDailyChart(current, range.from, range.to)

  return {
    revenue:       { label: 'Tržby',               value: revenue,  formatted: formatPrice(revenue),  comparison: prev ? compare(revenue, prevRev)    : undefined },
    orders:        { label: 'Objednávky',           value: orders,   formatted: String(orders),        comparison: prev ? compare(orders, prevOrders)  : undefined },
    avgOrderValue: { label: 'Průměrná objednávka',  value: aov,      formatted: formatPrice(aov),      comparison: prev ? compare(aov, prevAov)        : undefined },
    revenueChart,
    ordersChart,
    byStatus,
    bySource,
    topCustomers,
  }
}
