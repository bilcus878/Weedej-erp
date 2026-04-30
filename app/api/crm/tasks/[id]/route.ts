// PATCH  /api/crm/tasks/[id]  — update task (including status toggle)
// DELETE /api/crm/tasks/[id]  — delete task

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog, diffAndLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(Permission.CRM_EDIT_TASKS, req)
  if (!guard.ok) return guard.error

  try {
    const body   = await req.json()
    const before = await prisma.crmTask.findUnique({ where: { id: params.id } })
    if (!before) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const completedAt = body.status === 'done' && before.status !== 'done'
      ? new Date()
      : body.status !== 'done' ? null : before.completedAt

    const task = await prisma.crmTask.update({
      where: { id: params.id },
      data: {
        title:         body.title?.trim()       || before.title,
        description:   body.description?.trim() ?? before.description,
        type:          body.type                ?? before.type,
        status:        body.status              ?? before.status,
        priority:      body.priority            ?? before.priority,
        dueAt:         body.dueAt !== undefined ? (body.dueAt ? new Date(body.dueAt) : null) : before.dueAt,
        completedAt,
        assignedToId:  body.assignedToId        ?? before.assignedToId,
        contactId:     body.contactId           ?? before.contactId,
        opportunityId: body.opportunityId       ?? before.opportunityId,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy:  { select: { id: true, name: true } },
      },
    })

    await Promise.all(diffAndLog(
      { userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
        entityName: 'CrmTask', entityId: params.id, module: 'crm', ipAddress: guard.ctx.ipAddress },
      before as any, task as any,
    ))

    return NextResponse.json(task)
  } catch (error: any) {
    console.error('[CRM] tasks PATCH error:', error)
    if (error.code === 'P2025') return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(Permission.CRM_DELETE_TASKS, req)
  if (!guard.ok) return guard.error

  try {
    const task = await prisma.crmTask.findUnique({ where: { id: params.id } })
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    await prisma.crmTask.delete({ where: { id: params.id } })

    await createAuditLog({
      userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
      actionType: 'DELETE', entityName: 'CrmTask', entityId: params.id,
      oldValue: JSON.stringify({ title: task.title }), module: 'crm', ipAddress: guard.ctx.ipAddress,
    })

    return NextResponse.json({ message: 'Task deleted' })
  } catch (error) {
    console.error('[CRM] tasks DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
