// PATCH  /api/crm/contacts/[id]  — update contact
// DELETE /api/crm/contacts/[id]  — soft-delete (isActive = false)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog, diffAndLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(Permission.CRM_MANAGE_CONTACTS, req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()
    const before = await prisma.crmContact.findUnique({ where: { id: params.id } })
    if (!before) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    if (body.isPrimary && !before.isPrimary) {
      await prisma.crmContact.updateMany({
        where: { customerId: before.customerId, isPrimary: true },
        data:  { isPrimary: false },
      })
    }

    const contact = await prisma.crmContact.update({
      where: { id: params.id },
      data: {
        firstName: body.firstName?.trim() || before.firstName,
        lastName:  body.lastName?.trim()  ?? before.lastName,
        role:      body.role?.trim()      ?? before.role,
        email:     body.email?.trim()     ?? before.email,
        phone:     body.phone?.trim()     ?? before.phone,
        isPrimary: body.isPrimary         ?? before.isPrimary,
        note:      body.note?.trim()      ?? before.note,
      },
    })

    await Promise.all(diffAndLog(
      { userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
        entityName: 'CrmContact', entityId: params.id, module: 'crm', ipAddress: guard.ctx.ipAddress },
      before as any, contact as any,
    ))

    return NextResponse.json(contact)
  } catch (error: any) {
    console.error('[CRM] contacts PATCH error:', error)
    if (error.code === 'P2025') return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(Permission.CRM_MANAGE_CONTACTS, req)
  if (!guard.ok) return guard.error

  try {
    const contact = await prisma.crmContact.findUnique({ where: { id: params.id } })
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    await prisma.crmContact.update({ where: { id: params.id }, data: { isActive: false } })

    await createAuditLog({
      userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
      actionType: 'DELETE', entityName: 'CrmContact', entityId: params.id,
      oldValue: JSON.stringify({ firstName: contact.firstName }), module: 'crm', ipAddress: guard.ctx.ipAddress,
    })

    return NextResponse.json({ message: 'Contact removed' })
  } catch (error) {
    console.error('[CRM] contacts DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove contact' }, { status: 500 })
  }
}
