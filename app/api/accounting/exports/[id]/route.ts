// GET /api/accounting/exports/:id — job status + metadata

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission }          from '@/lib/routeGuard'
import { Permission }                 from '@/lib/permissions'
import { prisma }                     from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requirePermission(Permission.EXPORT_DATA, req)
  if (!guard.ok) return guard.error

  const job = await prisma.accountingExportJob.findUnique({
    where:  { id: params.id },
    select: {
      id:            true,
      createdBy:     true,
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

  if (!job)                                return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.createdBy !== guard.ctx.userId)  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(job)
}
