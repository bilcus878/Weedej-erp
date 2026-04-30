import { NextRequest, NextResponse }      from 'next/server'
import { requirePermission }              from '@/lib/routeGuard'
import { Permission }                     from '@/lib/permissions'
import { buildPreset }                    from '@/lib/analytics/dateRange'
import { getProductsReport }              from '@/features/analytics/services/productService'
import { buildCsv, buildExcel, buildPdf, contentTypeFor } from '@/lib/analytics/exportEngine'
import type { ExportFormat }              from '@/lib/analytics/exportEngine'

export const dynamic = 'force-dynamic'

const PRODUCTS_COLUMNS = [
  { header: 'Produkt',       key: 'productName' },
  { header: 'Prodáno (ks)', key: 'quantity'    },
  { header: 'Tržby (Kč)',   key: 'revenue'     },
]

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.VIEW_REPORTS, req)
  if (!guard.ok) return guard.error

  const { searchParams } = req.nextUrl
  const preset    = (searchParams.get('preset') ?? 'last30') as any
  const customFrom = searchParams.get('from')
  const customTo   = searchParams.get('to')
  const exportFmt  = searchParams.get('export') as ExportFormat | null

  if (exportFmt && !guard.ctx.permissions.includes(Permission.EXPORT_DATA)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const range  = buildPreset(preset, customFrom ? new Date(customFrom) : undefined, customTo ? new Date(customTo) : undefined)
  const report = await getProductsReport({ range })

  if (exportFmt) {
    const rows = report.topByRevenue.map(r => ({ productName: r.productName, quantity: r.quantity.toFixed(3), revenue: r.revenue.toFixed(2) }))
    if (exportFmt === 'csv')   return new Response(buildCsv(PRODUCTS_COLUMNS, rows),   { headers: { 'Content-Type': contentTypeFor('csv'),   'Content-Disposition': 'attachment; filename="products-report.csv"'  } })
    if (exportFmt === 'excel') return new Response(buildExcel(PRODUCTS_COLUMNS, rows), { headers: { 'Content-Type': contentTypeFor('excel'), 'Content-Disposition': 'attachment; filename="products-report.xlsx"' } })
    if (exportFmt === 'pdf')   return new Response(buildPdf({ title: 'Produkty', subtitle: range.label, columns: PRODUCTS_COLUMNS, rows }), { headers: { 'Content-Type': contentTypeFor('pdf'), 'Content-Disposition': 'attachment; filename="products-report.pdf"' } })
  }

  return NextResponse.json(report)
}
