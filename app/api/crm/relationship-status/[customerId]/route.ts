// GET /api/crm/relationship-status/[customerId]  — get or create
// PUT /api/crm/relationship-status/[customerId]  — update stage, owner, follow-up

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { customerId: string } }) {
  const guard = await requirePermission(Permission.CRM_VIEW_INTERACTIONS, req)
  if (!guard.ok) return guard.error

  try {
    const status = await prisma.crmRelationshipStatus.findUnique({
      where:   { customerId: params.customerId },
      include: { owner: { select: { id: true, name: true } } },
    })
    return NextResponse.json(status)
  } catch (error) {
    console.error('[CRM] relationship-status GET error:', error)
    return NextResponse.json({ error: 'Failed to load relationship status' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { customerId: string } }) {
  const guard = await requirePermission(Permission.CRM_EDIT_INTERACTIONS, req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()
    const { stage, healthScore, ownerId, nextFollowUpAt } = body

    const status = await prisma.crmRelationshipStatus.upsert({
      where:  { customerId: params.customerId },
      update: {
        ...(stage          !== undefined ? { stage }                               : {}),
        ...(healthScore    !== undefined ? { healthScore: Number(healthScore) }    : {}),
        ...(ownerId        !== undefined ? { ownerId: ownerId || null }            : {}),
        ...(nextFollowUpAt !== undefined ? { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null } : {}),
      },
      create: {
        customerId: params.customerId,
        stage:          stage          ?? 'prospect',
        healthScore:    healthScore    != null ? Number(healthScore) : null,
        ownerId:        ownerId        || null,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      },
      include: { owner: { select: { id: true, name: true } } },
    })

    await createAuditLog({
      userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
      actionType: 'UPDATE', entityName: 'CrmRelationshipStatus', entityId: status.id,
      newValue: JSON.stringify({ stage, customerId: params.customerId }), module: 'crm', ipAddress: guard.ctx.ipAddress,
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('[CRM] relationship-status PUT error:', error)
    return NextResponse.json({ error: 'Failed to update relationship status' }, { status: 500 })
  }
}
