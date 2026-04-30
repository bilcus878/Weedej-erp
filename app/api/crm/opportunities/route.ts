// GET  /api/crm/opportunities?customerId=  — list opportunities for a customer
// POST /api/crm/opportunities              — create opportunity

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.CRM_VIEW_OPPORTUNITIES, req)
  if (!guard.ok) return guard.error

  const { searchParams } = req.nextUrl
  const customerId = searchParams.get('customerId')
  if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })

  const stage = searchParams.get('stage')

  try {
    const opportunities = await prisma.crmOpportunity.findMany({
      where: {
        customerId,
        ...(stage ? { stage } : {}),
      },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: [{ stage: 'asc' }, { expectedCloseAt: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(opportunities)
  } catch (error) {
    console.error('[CRM] opportunities GET error:', error)
    return NextResponse.json({ error: 'Failed to load opportunities' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(Permission.CRM_CREATE_OPPORTUNITIES, req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()
    const { customerId, title, description, value, currency, probability, stage, expectedCloseAt, ownerId } = body

    if (!customerId?.trim()) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    if (!title?.trim())      return NextResponse.json({ error: 'title required' }, { status: 400 })

    const opportunity = await prisma.crmOpportunity.create({
      data: {
        customerId,
        title:           title.trim(),
        description:     description?.trim() || null,
        value:           value != null ? value : null,
        currency:        currency || 'CZK',
        probability:     probability != null ? Number(probability) : null,
        stage:           stage || 'lead',
        expectedCloseAt: expectedCloseAt ? new Date(expectedCloseAt) : null,
        ownerId:         ownerId || null,
        createdById:     guard.ctx.userId,
      },
      include: { owner: { select: { id: true, name: true } } },
    })

    await createAuditLog({
      userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
      actionType: 'CREATE', entityName: 'CrmOpportunity', entityId: opportunity.id,
      newValue: JSON.stringify({ title, stage, customerId }), module: 'crm', ipAddress: guard.ctx.ipAddress,
    })

    return NextResponse.json(opportunity, { status: 201 })
  } catch (error) {
    console.error('[CRM] opportunities POST error:', error)
    return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 })
  }
}
