import { NextRequest, NextResponse }      from 'next/server'
import { requirePermission }              from '@/lib/routeGuard'
import { Permission }                     from '@/lib/permissions'
import { buildPreset, getPreviousPeriod, getYearAgoPeriod } from '@/lib/analytics/dateRange'
import { getMarketingReport }             from '@/features/analytics/services/marketingService'
import { buildCsv, buildExcel, buildPdf, contentTypeFor } from '@/lib/analytics/exportEngine'
import type { ExportFormat }              from '@/lib/analytics/exportEngine'

export const dynamic = 'force-dynamic'

const TRAFFIC_COLUMNS = [
  { header: 'Zdroj',             key: 'source'    },
  { header: 'Sessions',          key: 'sessions'  },
  { header: 'Nákupy',           key: 'purchases' },
  { header: 'Tržby (Kč)',       key: 'revenue'   },
  { header: 'Konverzní poměr',  key: 'convRate'  },
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

  const report = await getMarketingReport({ range, prevRange })

  if (exportFmt) {
    const rows = report.trafficSources.map(ts => ({
      source:    ts.source,
      sessions:  ts.sessions,
      purchases: ts.purchases,
      revenue:   ts.revenue.toFixed(2),
      convRate:  `${ts.convRate} %`,
    }))

    if (exportFmt === 'csv') {
      return new Response(buildCsv(TRAFFIC_COLUMNS, rows), {
        headers: {
          'Content-Type': contentTypeFor('csv'),
          'Content-Disposition': `attachment; filename="marketing-report.csv"`,
        },
      })
    }
    if (exportFmt === 'excel') {
      return new Response(buildExcel(TRAFFIC_COLUMNS, rows), {
        headers: {
          'Content-Type': contentTypeFor('excel'),
          'Content-Disposition': `attachment; filename="marketing-report.xlsx"`,
        },
      })
    }
    if (exportFmt === 'pdf') {
      const buf = buildPdf({ title: 'Marketing Analytics', subtitle: range.label, columns: TRAFFIC_COLUMNS, rows })
      return new Response(buf, {
        headers: {
          'Content-Type': contentTypeFor('pdf'),
          'Content-Disposition': `attachment; filename="marketing-report.pdf"`,
        },
      })
    }
  }

  return NextResponse.json(report)
}
