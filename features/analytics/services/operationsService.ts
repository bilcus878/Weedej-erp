import { prisma }      from '@/lib/prisma'
import { compare }     from '@/lib/analytics/comparisonEngine'
import { formatPrice } from '@/lib/utils'
import type { DateRange } from '@/lib/analytics/dateRange'
import type { OperationsReport } from '../types'

interface OperationsServiceParams {
  range:    DateRange
  prevRange?: DateRange
}

export async function getOperationsReport({ range, prevRange }: OperationsServiceParams): Promise<OperationsReport> {
  const [allPending, periodOrders, prevPeriodOrders, shippedOrders] = await Promise.all([
    // Current pending/processing snapshot (not date-filtered)
    prisma.customerOrder.count({ where: { status: { in: ['new', 'processing'] } } }),
    // Orders created in period for breakdown
    prisma.customerOrder.findMany({
      where: { orderDate: { gte: range.from, lte: range.to } },
      select: { status: true, orderDate: true, shippedAt: true, createdAt: true, paidAt: true },
      orderBy: { orderDate: 'asc' },
    }),
    prevRange ? prisma.customerOrder.findMany({
      where: { orderDate: { gte: prevRange.from, lte: prevRange.to } },
      select: { status: true },
    }) : Promise.resolve(null),
    // Shipped orders in period
    prisma.customerOrder.count({
      where: {
        shippedAt: { gte: range.from, lte: range.to },
        status:    { not: 'storno' },
      },
    }),
  ])

  const cancelled     = periodOrders.filter(o => o.status === 'storno').length
  const prevCancelled = prevPeriodOrders?.filter(o => o.status === 'storno').length ?? 0
  const prevPending   = prevPeriodOrders?.filter(o => ['new', 'processing'].includes(o.status)).length ?? 0
  const prevShipped   = 0 // no prev period shipped available without extra query

  // Avg fulfillment time: orderDate → shippedAt for shipped orders in period
  const withFulfillment = periodOrders.filter(o => o.shippedAt && o.status !== 'storno')
  const avgFulfillmentMs = withFulfillment.length > 0
    ? withFulfillment.reduce((s, o) => s + (new Date(o.shippedAt!).getTime() - new Date(o.orderDate).getTime()), 0) / withFulfillment.length
    : 0
  const avgFulfillmentH = avgFulfillmentMs / (1000 * 60 * 60)

  const ordersByStatus = Object.entries(
    periodOrders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1
      return acc
    }, {})
  ).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count)

  // Shipped-per-day chart
  const dayMap: Record<string, number> = {}
  for (let d = new Date(range.from); d <= range.to; d.setDate(d.getDate() + 1)) {
    dayMap[d.toISOString().slice(0, 10)] = 0
  }
  for (const o of periodOrders) {
    if (o.shippedAt) {
      const key = new Date(o.shippedAt).toISOString().slice(0, 10)
      if (dayMap[key] !== undefined) dayMap[key]++
    }
  }
  const fulfillmentChart = Object.entries(dayMap).map(([date, value]) => ({ date, value }))

  return {
    pendingOrders:   { label: 'Čekající objednávky',    value: allPending,       formatted: String(allPending),                              comparison: prevPeriodOrders ? compare(allPending, prevPending) : undefined },
    avgFulfillmentH: { label: 'Průměrná expedice (h)',   value: avgFulfillmentH,  formatted: avgFulfillmentH > 0 ? `${avgFulfillmentH.toFixed(1)} h` : '—' },
    shippedInPeriod: { label: 'Expedováno v období',     value: shippedOrders,    formatted: String(shippedOrders) },
    cancelledOrders: { label: 'Stornováno',              value: cancelled,        formatted: String(cancelled),                               comparison: prevPeriodOrders ? compare(cancelled, prevCancelled) : undefined },
    ordersByStatus,
    fulfillmentChart,
  }
}
