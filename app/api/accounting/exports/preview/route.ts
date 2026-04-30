// POST /api/accounting/exports/preview — count documents for a date range
// Returns counts per type without generating any file. Used for UI confirmation.

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission }          from '@/lib/routeGuard'
import { Permission }                 from '@/lib/permissions'
import { previewDocuments }           from '@/lib/accounting/normalizer'
import type { DocType }               from '@/lib/accounting/types'
import { z }                          from 'zod'

export const dynamic = 'force-dynamic'

const VALID_DOC_TYPES: DocType[] = [
  'issued_invoice', 'received_invoice', 'credit_note',
  'payment', 'customer_order', 'delivery_note', 'receipt', 'stock_movement',
]

const PreviewSchema = z.object({
  dateFrom:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  documentTypes: z.array(z.enum(VALID_DOC_TYPES as [DocType, ...DocType[]])).min(1),
})

export async function POST(req: NextRequest) {
  const guard = await requirePermission(Permission.EXPORT_DATA, req)
  if (!guard.ok) return guard.error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = PreviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 422 })
  }

  const { dateFrom, dateTo, documentTypes } = parsed.data
  const from = new Date(`${dateFrom}T00:00:00.000Z`)
  const to   = new Date(`${dateTo}T23:59:59.999Z`)

  const preview = await previewDocuments({ dateFrom: from, dateTo: to, documentTypes })
  return NextResponse.json(preview)
}
