import { NextRequest, NextResponse } from 'next/server'
import { requirePermission }         from '@/lib/routeGuard'
import { Permission }                from '@/lib/permissions'
import { buildPreset, getPreviousPeriod, getYearAgoPeriod } from '@/lib/analytics/dateRange'
import { compare }                   from '@/lib/analytics/comparisonEngine'
import { formatPrice }               from '@/lib/utils'
import { prisma }                    from '@/lib/prisma'
import type { OverviewReport }       from '@/features/analytics/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.VIEW_REPORTS, req)
  if (!guard.ok) return guard.error

  const { searchParams } = req.nextUrl
  const preset    = (searchParams.get('preset')  ?? 'last30') as any
  const compareMode = searchParams.get('compare') ?? 'none'
  const customFrom  = searchParams.get('from')
  const customTo    = searchParams.get('to')

  const range = buildPreset(
    preset,
    customFrom ? new Date(customFrom) : undefined,
    customTo   ? new Date(customTo)   : undefined,
  )

  const prevRange =
    compareMode === 'previous_period' ? getPreviousPeriod(range) :
    compareMode === 'year_ago'        ? getYearAgoPeriod(range)  : null

  const [orders, prevOrders, newCustomers, prevNewCustomers] = await Promise.all([
    prisma.customerOrder.findMany({
      where: { orderDate: { gte: range.from, lte: range.to }, status: { not: 'storno' } },
      select: { totalAmount: true, orderDate: true, customerId: true },
      orderBy: { orderDate: 'asc' },
    }),
    prevRange ? prisma.customerOrder.findMany({
      where: { orderDate: { gte: prevRange.from, lte: prevRange.to }, status: { not: 'storno' } },
      select: { totalAmount: true },
    }) : Promise.resolve(null),
    // New customers: their first order falls in this range
    prisma.customerOrder.groupBy({
      by: ['customerId'],
      where: { status: { not: 'storno' } },
      having: { customerId: { _min: { gte: range.from as any } } },
      _count: { _all: true },
    }).catch(() => [] as any[]),
    prevRange ? prisma.customerOrder.groupBy({
      by: ['customerId'],
      where: { status: { not: 'storno' } },
    }).catch(() => [] as any[]) : Promise.resolve(null),
  ])

  const revenue    = orders.reduce((s, o) => s + Number(o.totalAmount), 0)
  const prevRev    = prevOrders?.reduce((s, o) => s + Number(o.totalAmount), 0) ?? 0
  const orderCount = orders.length
  const prevCount  = prevOrders?.length ?? 0
  const aov        = orderCount > 0 ? revenue / orderCount : 0
  const prevAov    = prevCount  > 0 ? prevRev  / prevCount  : 0

  // Daily breakdown
  const dayMap: Record<string, { revenue: number; orders: number }> = {}
  for (let d = new Date(range.from); d <= range.to; d.setDate(d.getDate() + 1)) {
    dayMap[d.toISOString().slice(0, 10)] = { revenue: 0, orders: 0 }
  }
  for (const o of orders) {
    const key = new Date(o.orderDate).toISOString().slice(0, 10)
    if (dayMap[key]) { dayMap[key].revenue += Number(o.totalAmount); dayMap[key].orders++ }
  }

  const result: OverviewReport = {
    revenue:       { label: 'Tržby',               value: revenue,    formatted: formatPrice(revenue),  comparison: prevOrders ? compare(revenue,    prevRev)   : undefined },
    orders:        { label: 'Objednávky',           value: orderCount, formatted: String(orderCount),    comparison: prevOrders ? compare(orderCount, prevCount) : undefined },
    avgOrderValue: { label: 'Průměrná objednávka',  value: aov,        formatted: formatPrice(aov),      comparison: prevOrders ? compare(aov,        prevAov)   : undefined },
    newCustomers:  { label: 'Noví zákazníci',       value: 0,          formatted: '—' },
    revenueChart:  Object.entries(dayMap).map(([date, v]) => ({ date, value: v.revenue })),
    ordersChart:   Object.entries(dayMap).map(([date, v]) => ({ date, value: v.orders  })),
  }

  return NextResponse.json(result)
}
