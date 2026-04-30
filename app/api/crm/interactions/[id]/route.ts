// PATCH  /api/crm/interactions/[id]  — update interaction
// DELETE /api/crm/interactions/[id]  — delete interaction

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog, diffAndLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(Permission.CRM_EDIT_INTERACTIONS, req)
  if (!guard.ok) return guard.error

  try {
    const body   = await req.json()
    const before = await prisma.crmInteraction.findUnique({ where: { id: params.id } })
    if (!before) return NextResponse.json({ error: 'Interaction not found' }, { status: 404 })

    const interaction = await prisma.crmInteraction.update({
      where: { id: params.id },
      data: {
        type:          body.type          ?? before.type,
        direction:     body.direction     ?? before.direction,
        subject:       body.subject?.trim() || before.subject,
        body:          body.body?.trim()    ?? before.body,
        outcome:       body.outcome?.trim() ?? before.outcome,
        occurredAt:    body.occurredAt ? new Date(body.occurredAt) : before.occurredAt,
        durationMin:   body.durationMin != null ? Number(body.durationMin) : before.durationMin,
        contactId:     body.contactId   ?? before.contactId,
        opportunityId: body.opportunityId ?? before.opportunityId,
      },
      include: { createdBy: { select: { id: true, name: true } }, contact: { select: { id: true, firstName: true, lastName: true } } },
    })

    await Promise.all(diffAndLog(
      { userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
        entityName: 'CrmInteraction', entityId: params.id, module: 'crm', ipAddress: guard.ctx.ipAddress },
      before as any, interaction as any,
    ))

    return NextResponse.json(interaction)
  } catch (error: any) {
    console.error('[CRM] interactions PATCH error:', error)
    if (error.code === 'P2025') return NextResponse.json({ error: 'Interaction not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update interaction' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(Permission.CRM_DELETE_INTERACTIONS, req)
  if (!guard.ok) return guard.error

  try {
    const interaction = await prisma.crmInteraction.findUnique({ where: { id: params.id } })
    if (!interaction) return NextResponse.json({ error: 'Interaction not found' }, { status: 404 })

    await prisma.crmInteraction.delete({ where: { id: params.id } })

    await createAuditLog({
      userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
      actionType: 'DELETE', entityName: 'CrmInteraction', entityId: params.id,
      oldValue: JSON.stringify({ type: interaction.type, subject: interaction.subject }), module: 'crm', ipAddress: guard.ctx.ipAddress,
    })

    return NextResponse.json({ message: 'Interaction deleted' })
  } catch (error) {
    console.error('[CRM] interactions DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete interaction' }, { status: 500 })
  }
}
