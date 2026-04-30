// POST /api/accounting/exports — create and process export job
// GET  /api/accounting/exports — list past export jobs for current user

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission }          from '@/lib/routeGuard'
import { Permission }                 from '@/lib/permissions'
import { prisma }                     from '@/lib/prisma'
import { processExport }              from '@/lib/accounting/exportJob'
import { previewDocuments }           from '@/lib/accounting/normalizer'
import type { DocType, ExportFormat } from '@/lib/accounting/types'
import { z }                          from 'zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 120  // allow up to 2 min for large exports on Vercel

const VALID_DOC_TYPES: DocType[] = [
  'issued_invoice', 'received_invoice', 'credit_note',
  'payment', 'customer_order', 'delivery_note', 'receipt', 'stock_movement',
]

const VALID_FORMATS: ExportFormat[] = [
  'csv', 'xlsx', 'zip', 'pohoda_xml', 'money_xml', 'generic_csv',
]

const ExportSchema = z.object({
  dateFrom:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  documentTypes: z.array(z.enum(VALID_DOC_TYPES as [DocType, ...DocType[]])).min(1),
  format:        z.enum(VALID_FORMATS as [ExportFormat, ...ExportFormat[]]),
  includePdfs:   z.boolean().optional().default(true),
})

// ─── POST — create export ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await requirePermission(Permission.EXPORT_DATA, req)
  if (!guard.ok) return guard.error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ExportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 422 })
  }

  const { dateFrom, dateTo, documentTypes, format, includePdfs } = parsed.data

  const from = new Date(`${dateFrom}T00:00:00.000Z`)
  const to   = new Date(`${dateTo}T23:59:59.999Z`)

  if (from > to) {
    return NextResponse.json({ error: 'dateFrom must be before dateTo' }, { status: 400 })
  }

  try {
    const jobId = await processExport(
      { dateFrom: from, dateTo: to, documentTypes, format, includePdfs },
      guard.ctx.userId,
      guard.ctx.username,
    )
    return NextResponse.json({ jobId, status: 'completed' }, { status: 201 })
  } catch (err) {
    console.error('[AccountingExport] Export failed:', err)
    return NextResponse.json({ error: 'Export failed', message: String(err) }, { status: 500 })
  }
}

// ─── GET — list past exports ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.EXPORT_DATA, req)
  if (!guard.ok) return guard.error

  const jobs = await prisma.accountingExportJob.findMany({
    where:   { createdBy: guard.ctx.userId },
    orderBy: { createdAt: 'desc' },
    take:    50,
    select: {
      id:            true,
      dateFrom:      true,
      dateTo:        true,
      documentTypes: true,
      exportFormat:  true,
      status:        true,
      fileName:      true,
      fileSize:      true,
      rowCount:      true,
      errorMessage:  true,
      completedAt:   true,
      expiresAt:     true,
      createdAt:     true,
    },
  })

  return NextResponse.json(jobs)
}
