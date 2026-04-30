// GET  /api/crm/tasks?customerId=  — list tasks (filter by customer, status, assignee)
// POST /api/crm/tasks              — create task

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.CRM_VIEW_TASKS, req)
  if (!guard.ok) return guard.error

  const { searchParams } = req.nextUrl
  const customerId   = searchParams.get('customerId')
  const status       = searchParams.get('status')
  const assignedToId = searchParams.get('assignedToId')

  if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })

  try {
    const tasks = await prisma.crmTask.findMany({
      where: {
        customerId,
        ...(status       ? { status }       : {}),
        ...(assignedToId ? { assignedToId } : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy:  { select: { id: true, name: true } },
        contact:    { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('[CRM] tasks GET error:', error)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(Permission.CRM_CREATE_TASKS, req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()
    const { customerId, contactId, title, description, type, priority, dueAt, assignedToId, opportunityId } = body

    if (!customerId?.trim()) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    if (!title?.trim())      return NextResponse.json({ error: 'title required' }, { status: 400 })

    const task = await prisma.crmTask.create({
      data: {
        customerId,
        contactId:     contactId     || null,
        title:         title.trim(),
        description:   description?.trim() || null,
        type:          type          || 'follow_up',
        status:        'open',
        priority:      priority      || 'normal',
        dueAt:         dueAt ? new Date(dueAt) : null,
        assignedToId:  assignedToId  || null,
        opportunityId: opportunityId || null,
        createdById:   guard.ctx.userId,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy:  { select: { id: true, name: true } },
      },
    })

    await createAuditLog({
      userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
      actionType: 'CREATE', entityName: 'CrmTask', entityId: task.id,
      newValue: JSON.stringify({ title, customerId, priority }), module: 'crm', ipAddress: guard.ctx.ipAddress,
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('[CRM] tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
