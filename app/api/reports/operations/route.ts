import { NextRequest, NextResponse }      from 'next/server'
import { requirePermission }              from '@/lib/routeGuard'
import { Permission }                     from '@/lib/permissions'
import { buildPreset, getPreviousPeriod, getYearAgoPeriod } from '@/lib/analytics/dateRange'
import { getOperationsReport }            from '@/features/analytics/services/operationsService'
import { buildCsv, buildExcel, buildPdf, contentTypeFor } from '@/lib/analytics/exportEngine'
import type { ExportFormat }              from '@/lib/analytics/exportEngine'

export const dynamic = 'force-dynamic'

const OPS_COLUMNS = [
  { header: 'Stav',        key: 'status' },
  { header: 'Objednávky', key: 'count'  },
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

  const range     = buildPreset(preset, customFrom ? new Date(customFrom) : undefined, customTo ? new Date(customTo) : undefined)
  const prevRange = compareMode === 'previous_period' ? getPreviousPeriod(range) : compareMode === 'year_ago' ? getYearAgoPeriod(range) : undefined
  const report    = await getOperationsReport({ range, prevRange })

  if (exportFmt) {
    const rows = report.ordersByStatus.map(r => ({ status: r.status, count: String(r.count) }))
    if (exportFmt === 'csv')   return new Response(buildCsv(OPS_COLUMNS, rows),   { headers: { 'Content-Type': contentTypeFor('csv'),   'Content-Disposition': 'attachment; filename="operations-report.csv"'  } })
    if (exportFmt === 'excel') return new Response(buildExcel(OPS_COLUMNS, rows), { headers: { 'Content-Type': contentTypeFor('excel'), 'Content-Disposition': 'attachment; filename="operations-report.xlsx"' } })
    if (exportFmt === 'pdf')   return new Response(buildPdf({ title: 'Operace', subtitle: range.label, columns: OPS_COLUMNS, rows }), { headers: { 'Content-Type': contentTypeFor('pdf'), 'Content-Disposition': 'attachment; filename="operations-report.pdf"' } })
  }

  return NextResponse.json(report)
}
