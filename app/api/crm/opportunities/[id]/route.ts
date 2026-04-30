// PATCH  /api/crm/opportunities/[id]  — update opportunity / stage
// DELETE /api/crm/opportunities/[id]  — delete opportunity

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog, diffAndLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(Permission.CRM_EDIT_OPPORTUNITIES, req)
  if (!guard.ok) return guard.error

  try {
    const body   = await req.json()
    const before = await prisma.crmOpportunity.findUnique({ where: { id: params.id } })
    if (!before) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    const closedAt = ['won', 'lost'].includes(body.stage) && !['won', 'lost'].includes(before.stage)
      ? new Date()
      : !['won', 'lost'].includes(body.stage ?? before.stage) ? null : before.closedAt

    const opportunity = await prisma.crmOpportunity.update({
      where: { id: params.id },
      data: {
        title:           body.title?.trim()       || before.title,
        description:     body.description?.trim() ?? before.description,
        value:           body.value != null ? body.value : before.value,
        currency:        body.currency            ?? before.currency,
        probability:     body.probability != null ? Number(body.probability) : before.probability,
        stage:           body.stage               ?? before.stage,
        lostReason:      body.lostReason?.trim()  ?? before.lostReason,
        expectedCloseAt: body.expectedCloseAt !== undefined
          ? (body.expectedCloseAt ? new Date(body.expectedCloseAt) : null)
          : before.expectedCloseAt,
        closedAt,
        ownerId:         body.ownerId             ?? before.ownerId,
      },
      include: { owner: { select: { id: true, name: true } } },
    })

    await Promise.all(diffAndLog(
      { userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
        entityName: 'CrmOpportunity', entityId: params.id, module: 'crm', ipAddress: guard.ctx.ipAddress },
      before as any, opportunity as any,
    ))

    return NextResponse.json(opportunity)
  } catch (error: any) {
    console.error('[CRM] opportunities PATCH error:', error)
    if (error.code === 'P2025') return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(Permission.CRM_DELETE_OPPORTUNITIES, req)
  if (!guard.ok) return guard.error

  try {
    const opp = await prisma.crmOpportunity.findUnique({ where: { id: params.id } })
    if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    await prisma.crmOpportunity.delete({ where: { id: params.id } })

    await createAuditLog({
      userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
      actionType: 'DELETE', entityName: 'CrmOpportunity', entityId: params.id,
      oldValue: JSON.stringify({ title: opp.title, stage: opp.stage }), module: 'crm', ipAddress: guard.ctx.ipAddress,
    })

    return NextResponse.json({ message: 'Opportunity deleted' })
  } catch (error) {
    console.error('[CRM] opportunities DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 })
  }
}
