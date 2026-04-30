// GET /api/accounting/exports/:id/download — stream the export file

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission }          from '@/lib/routeGuard'
import { Permission }                 from '@/lib/permissions'
import { prisma }                     from '@/lib/prisma'
import { readExportFile }             from '@/lib/accounting/exportJob'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requirePermission(Permission.EXPORT_DATA, req)
  if (!guard.ok) return guard.error

  const job = await prisma.accountingExportJob.findUnique({
    where:  { id: params.id },
    select: { createdBy: true, status: true, expiresAt: true },
  })

  if (!job)                               return NextResponse.json({ error: 'Not found' },   { status: 404 })
  if (job.createdBy !== guard.ctx.userId) return NextResponse.json({ error: 'Forbidden' },   { status: 403 })
  if (job.status !== 'completed')         return NextResponse.json({ error: 'Not ready' },   { status: 409 })
  if (job.expiresAt && job.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Export expired' }, { status: 410 })
  }

  const result = await readExportFile(params.id)
  if (!result) return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })

  return new Response(result.buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        result.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
      'Content-Length':      String(result.buffer.length),
      'Cache-Control':       'private, no-cache',
    },
  })
}
