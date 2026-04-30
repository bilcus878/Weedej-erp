import { prisma }      from '@/lib/prisma'
import { compare }     from '@/lib/analytics/comparisonEngine'
import { formatPrice } from '@/lib/utils'
import type { DateRange } from '@/lib/analytics/dateRange'
import type { CustomersReport } from '../types'

interface CustomerServiceParams {
  range:    DateRange
  prevRange?: DateRange
}

export async function getCustomersReport({ range, prevRange }: CustomerServiceParams): Promise<CustomersReport> {
  const [allCustomers, currentOrders, prevOrders] = await Promise.all([
    prisma.customer.count(),
    prisma.customerOrder.findMany({
      where: { orderDate: { gte: range.from, lte: range.to }, status: { not: 'storno' } },
      select: { customerId: true, customerName: true, totalAmount: true, orderDate: true },
      orderBy: { orderDate: 'asc' },
    }),
    prevRange ? prisma.customerOrder.findMany({
      where: { orderDate: { gte: prevRange.from, lte: prevRange.to }, status: { not: 'storno' } },
      select: { customerId: true },
    }) : Promise.resolve(null),
  ])

  // Customers who placed their very first order in this period
  const customerIdsInPeriod = [...new Set(currentOrders.map(o => o.customerId).filter(Boolean))] as string[]

  let newInPeriod = 0
  if (customerIdsInPeriod.length) {
    const firstOrders = await prisma.customerOrder.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIdsInPeriod } },
      _min: { orderDate: true },
    })
    newInPeriod = firstOrders.filter(fo =>
      fo._min.orderDate && fo._min.orderDate >= range.from && fo._min.orderDate <= range.to
    ).length
  }

  const prevCustomerIds = new Set((prevOrders ?? []).map(o => o.customerId).filter(Boolean))
  const returning = customerIdsInPeriod.filter(id => prevCustomerIds.has(id)).length

  const customerRevMap = currentOrders.reduce<Record<string, { name: string; orderCount: number; revenue: number; lastOrder: string }>>((acc, o) => {
    const k = o.customerId ?? o.customerName ?? 'Neznámý'
    if (!acc[k]) acc[k] = { name: o.customerName ?? 'Neznámý', orderCount: 0, revenue: 0, lastOrder: '' }
    acc[k].orderCount += 1
    acc[k].revenue    += Number(o.totalAmount)
    const d = new Date(o.orderDate).toISOString().slice(0, 10)
    if (d > acc[k].lastOrder) acc[k].lastOrder = d
    return acc
  }, {})
  const topByRevenue = Object.values(customerRevMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  const uniqueInPeriod = customerIdsInPeriod.length
  const prevUnique     = prevOrders ? new Set(prevOrders.map(o => o.customerId)).size : 0
  const totalRevenue   = currentOrders.reduce((s, o) => s + Number(o.totalAmount), 0)
  const avgLtv         = uniqueInPeriod > 0 ? totalRevenue / uniqueInPeriod : 0
  const retentionRate  = uniqueInPeriod > 0 ? (returning / uniqueInPeriod) * 100 : 0

  // New customers by day
  const newByDayMap: Record<string, number> = {}
  for (let d = new Date(range.from); d <= range.to; d.setDate(d.getDate() + 1)) {
    newByDayMap[d.toISOString().slice(0, 10)] = 0
  }
  // approximate: count unique customers whose first order in this period is that day
  const firstOrderDays: Record<string, string> = {}
  for (const o of currentOrders) {
    const k = o.customerId ?? o.customerName ?? 'anon'
    const day = new Date(o.orderDate).toISOString().slice(0, 10)
    if (!firstOrderDays[k] || day < firstOrderDays[k]) firstOrderDays[k] = day
  }
  for (const [, day] of Object.entries(firstOrderDays)) {
    if (newByDayMap[day] !== undefined) newByDayMap[day]++
  }
  const newByDay = Object.entries(newByDayMap).map(([date, value]) => ({ date, value }))

  return {
    total:        { label: 'Celkem zákazníků', value: allCustomers,     formatted: String(allCustomers) },
    newInPeriod:  { label: 'Noví za období',   value: newInPeriod,      formatted: String(newInPeriod),   comparison: prevOrders ? compare(newInPeriod, prevUnique) : undefined },
    returning:    { label: 'Vracející se',      value: returning,        formatted: String(returning) },
    avgLtv:       { label: 'Průměr. LTV',       value: avgLtv,           formatted: formatPrice(avgLtv) },
    retentionRate:{ label: 'Míra retence',      value: retentionRate,    formatted: `${retentionRate.toFixed(1)} %` },
    newByDay,
    topByRevenue,
  }
}
