import { NextRequest, NextResponse }      from 'next/server'
import { requirePermission }              from '@/lib/routeGuard'
import { Permission }                     from '@/lib/permissions'
import { buildPreset, getPreviousPeriod, getYearAgoPeriod } from '@/lib/analytics/dateRange'
import { getCustomersReport }             from '@/features/analytics/services/customerService'
import { buildCsv, buildExcel, buildPdf, contentTypeFor } from '@/lib/analytics/exportEngine'
import type { ExportFormat }              from '@/lib/analytics/exportEngine'

export const dynamic = 'force-dynamic'

const CUSTOMERS_COLUMNS = [
  { header: 'Zákazník',             key: 'name'        },
  { header: 'Objednávky',           key: 'orderCount'  },
  { header: 'Tržby (Kč)',           key: 'revenue'     },
  { header: 'Poslední objednávka',  key: 'lastOrder'   },
]

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.VIEW_REPORTS, req)
  if (!guard.ok) return guard.error

  const { searchParams } = req.nextUrl
  const preset      = (searchParams.get('preset') ?? 'last30') as any
  const compareMode = searchParams.get('compare') ?? 'none'
  const customFrom  = searchParams.get('from')
  const customTo    = searchParams.get('to')
  const exportFmt   = searchParams.get('export') as ExportFormat | null

  if (exportFmt && !guard.ctx.permissions.includes(Permission.EXPORT_DATA)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const range = buildPreset(preset, customFrom ? new Date(customFrom) : undefined, customTo ? new Date(customTo) : undefined)
  const prevRange = compareMode === 'previous_period' ? getPreviousPeriod(range) : compareMode === 'year_ago' ? getYearAgoPeriod(range) : undefined

  const report = await getCustomersReport({ range, prevRange })

  if (exportFmt) {
    const rows = report.topByRevenue.map(r => ({ name: r.name, orderCount: r.orderCount, revenue: r.revenue.toFixed(2), lastOrder: r.lastOrder }))
    if (exportFmt === 'csv')   return new Response(buildCsv(CUSTOMERS_COLUMNS, rows),   { headers: { 'Content-Type': contentTypeFor('csv'),   'Content-Disposition': 'attachment; filename="customers-report.csv"'  } })
    if (exportFmt === 'excel') return new Response(buildExcel(CUSTOMERS_COLUMNS, rows), { headers: { 'Content-Type': contentTypeFor('excel'), 'Content-Disposition': 'attachment; filename="customers-report.xlsx"' } })
    if (exportFmt === 'pdf')   return new Response(buildPdf({ title: 'Zákazníci', subtitle: range.label, columns: CUSTOMERS_COLUMNS, rows }), { headers: { 'Content-Type': contentTypeFor('pdf'), 'Content-Disposition': 'attachment; filename="customers-report.pdf"' } })
  }

  return NextResponse.json(report)
}
