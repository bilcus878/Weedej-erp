import { NextRequest, NextResponse } from 'next/server'
import { requirePermission }         from '@/lib/platform/auth/routeGuard'
import { Permission }                from '@/lib/shared/permissions'
import { buildPreset, getPreviousPeriod, getYearAgoPeriod } from '@/lib/features/analytics/dateRange'
import { compare }                   from '@/lib/features/analytics/comparisonEngine'
import { formatPrice } from '@/lib/shared/finance/money'
import { buildCsv, buildExcel, buildPdf, contentTypeFor } from '@/lib/features/analytics/exportEngine'
import { prisma }                    from '@/lib/platform/db/prisma'
import type { OverviewReport }       from '@/features/analytics/types'
import type { ExportFormat }         from '@/lib/features/analytics/exportEngine'

export const dynamic = 'force-dynamic'

const EXPORT_COLUMNS = [
  { header: 'Datum',          key: 'date'    },
  { header: 'Tržby (Kč)',     key: 'revenue' },
  { header: 'Objednávky',     key: 'orders'  },
]

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.VIEW_REPORTS, req)
  if (!guard.ok) return guard.error

  const { searchParams } = req.nextUrl
  const preset      = (searchParams.get('preset')  ?? 'last30') as any
  const compareMode = searchParams.get('compare') ?? 'none'
  const customFrom  = searchParams.get('from')
  const customTo    = searchParams.get('to')
  const exportFmt   = searchParams.get('export') as ExportFormat | null

  if (exportFmt && !guard.ctx.permissions.includes(Permission.EXPORT_DATA)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const range = buildPreset(
    preset,
    customFrom ? new Date(customFrom) : undefined,
    customTo   ? new Date(customTo)   : undefined,
  )

  const prevRange =
    compareMode === 'previous_period' ? getPreviousPeriod(range) :
    compareMode === 'year_ago'        ? getYearAgoPeriod(range)  : null

  const [orders, prevOrders] = await Promise.all([
    prisma.customerOrder.findMany({
      where: { orderDate: { gte: range.from, lte: range.to }, status: { not: 'storno' } },
      select: { totalAmount: true, orderDate: true, customerId: true },
      orderBy: { orderDate: 'asc' },
    }),
    prevRange ? prisma.customerOrder.findMany({
      where: { orderDate: { gte: prevRange.from, lte: prevRange.to }, status: { not: 'storno' } },
      select: { totalAmount: true },
    }) : Promise.resolve(null),
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

  const revenueChart = Object.entries(dayMap).map(([date, v]) => ({ date, value: v.revenue }))
  const ordersChart  = Object.entries(dayMap).map(([date, v]) => ({ date, value: v.orders  }))

  if (exportFmt) {
    const rows = revenueChart.map((pt, i) => ({
      date:    pt.date,
      revenue: pt.value.toFixed(2),
      orders:  ordersChart[i]?.value ?? 0,
    }))
    if (exportFmt === 'csv') {
      return new Response(buildCsv(EXPORT_COLUMNS, rows), {
        headers: { 'Content-Type': contentTypeFor('csv'), 'Content-Disposition': 'attachment; filename="prehled-report.csv"' },
      })
    }
    if (exportFmt === 'excel') {
      return new Response(buildExcel(EXPORT_COLUMNS, rows), {
        headers: { 'Content-Type': contentTypeFor('excel'), 'Content-Disposition': 'attachment; filename="prehled-report.xlsx"' },
      })
    }
    if (exportFmt === 'pdf') {
      const buf = buildPdf({ title: 'Přehled', subtitle: range.label, columns: EXPORT_COLUMNS, rows })
      return new Response(buf, {
        headers: { 'Content-Type': contentTypeFor('pdf'), 'Content-Disposition': 'attachment; filename="prehled-report.pdf"' },
      })
    }
  }

  const result: OverviewReport = {
    revenue:       { label: 'Tržby',               value: revenue,    formatted: formatPrice(revenue),  comparison: prevOrders ? compare(revenue,    prevRev)   : undefined },
    orders:        { label: 'Objednávky',           value: orderCount, formatted: String(orderCount),    comparison: prevOrders ? compare(orderCount, prevCount) : undefined },
    avgOrderValue: { label: 'Průměrná objednávka',  value: aov,        formatted: formatPrice(aov),      comparison: prevOrders ? compare(aov,        prevAov)   : undefined },
    newCustomers:  { label: 'Noví zákazníci',       value: 0,          formatted: '—' },
    revenueChart,
    ordersChart,
  }

  return NextResponse.json(result)
}
