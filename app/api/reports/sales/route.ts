import { NextRequest, NextResponse }      from 'next/server'
import { requirePermission }              from '@/lib/routeGuard'
import { Permission }                     from '@/lib/permissions'
import { buildPreset, getPreviousPeriod, getYearAgoPeriod } from '@/lib/analytics/dateRange'
import { getSalesReport }                 from '@/features/analytics/services/salesService'
import { buildCsv, buildExcel, buildPdf, contentTypeFor, fileExtFor } from '@/lib/analytics/exportEngine'
import type { ExportFormat }              from '@/lib/analytics/exportEngine'

export const dynamic = 'force-dynamic'

const SALES_COLUMNS = [
  { header: 'Datum',               key: 'date'     },
  { header: 'Tržby (Kč)',          key: 'revenue'  },
  { header: 'Objednávky',          key: 'orders'   },
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

  const range = buildPreset(
    preset,
    customFrom ? new Date(customFrom) : undefined,
    customTo   ? new Date(customTo)   : undefined,
  )
  const prevRange =
    compareMode === 'previous_period' ? getPreviousPeriod(range) :
    compareMode === 'year_ago'        ? getYearAgoPeriod(range)  : undefined

  const report = await getSalesReport({ range, prevRange })

  if (exportFmt) {
    const rows = report.revenueChart.map((pt, i) => ({
      date:    pt.date,
      revenue: pt.value.toFixed(2),
      orders:  report.ordersChart[i]?.value ?? 0,
    }))

    if (exportFmt === 'csv') {
      return new Response(buildCsv(SALES_COLUMNS, rows), {
        headers: {
          'Content-Type': contentTypeFor('csv'),
          'Content-Disposition': `attachment; filename="sales-report.csv"`,
        },
      })
    }
    if (exportFmt === 'excel') {
      return new Response(buildExcel(SALES_COLUMNS, rows), {
        headers: {
          'Content-Type': contentTypeFor('excel'),
          'Content-Disposition': `attachment; filename="sales-report.xlsx"`,
        },
      })
    }
    if (exportFmt === 'pdf') {
      const buf = buildPdf({ title: 'Přehled prodejů', subtitle: `${range.label}`, columns: SALES_COLUMNS, rows })
      return new Response(buf, {
        headers: {
          'Content-Type': contentTypeFor('pdf'),
          'Content-Disposition': `attachment; filename="sales-report.pdf"`,
        },
      })
    }
  }

  return NextResponse.json(report)
}
