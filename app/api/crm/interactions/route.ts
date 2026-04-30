// GET  /api/crm/interactions?customerId=  — list interactions for a customer
// POST /api/crm/interactions              — log a new interaction

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.CRM_VIEW_INTERACTIONS, req)
  if (!guard.ok) return guard.error

  const { searchParams } = req.nextUrl
  const customerId = searchParams.get('customerId')
  if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })

  const type = searchParams.get('type')

  try {
    const interactions = await prisma.crmInteraction.findMany({
      where: {
        customerId,
        ...(type ? { type } : {}),
      },
      include: { createdBy: { select: { id: true, name: true } }, contact: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(interactions)
  } catch (error) {
    console.error('[CRM] interactions GET error:', error)
    return NextResponse.json({ error: 'Failed to load interactions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(Permission.CRM_CREATE_INTERACTIONS, req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()
    const { customerId, contactId, type, direction, subject, body: bodyText, outcome, occurredAt, durationMin, opportunityId } = body

    if (!customerId?.trim()) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    if (!type?.trim())       return NextResponse.json({ error: 'type required' }, { status: 400 })
    if (!subject?.trim())    return NextResponse.json({ error: 'subject required' }, { status: 400 })
    if (!occurredAt)         return NextResponse.json({ error: 'occurredAt required' }, { status: 400 })

    const interaction = await prisma.crmInteraction.create({
      data: {
        customerId,
        contactId:     contactId     || null,
        type,
        direction:     direction     || null,
        subject:       subject.trim(),
        body:          bodyText?.trim() || null,
        outcome:       outcome?.trim()  || null,
        occurredAt:    new Date(occurredAt),
        durationMin:   durationMin ? Number(durationMin) : null,
        opportunityId: opportunityId || null,
        createdById:   guard.ctx.userId,
      },
      include: { createdBy: { select: { id: true, name: true } }, contact: { select: { id: true, firstName: true, lastName: true } } },
    })

    // Upsert last-contacted date on relationship status
    await prisma.crmRelationshipStatus.upsert({
      where:  { customerId },
      update: { lastContactedAt: new Date(occurredAt) },
      create: { customerId, stage: 'prospect', lastContactedAt: new Date(occurredAt) },
    })

    await createAuditLog({
      userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
      actionType: 'CREATE', entityName: 'CrmInteraction', entityId: interaction.id,
      newValue: JSON.stringify({ type, subject, customerId }), module: 'crm', ipAddress: guard.ctx.ipAddress,
    })

    return NextResponse.json(interaction, { status: 201 })
  } catch (error) {
    console.error('[CRM] interactions POST error:', error)
    return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 })
  }
}
