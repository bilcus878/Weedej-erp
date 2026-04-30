// GET  /api/crm/contacts?customerId=  — list contacts for a customer
// POST /api/crm/contacts              — create contact

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.CRM_VIEW_CONTACTS, req)
  if (!guard.ok) return guard.error

  const customerId = req.nextUrl.searchParams.get('customerId')
  if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })

  try {
    const contacts = await prisma.crmContact.findMany({
      where:   { customerId, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
    })
    return NextResponse.json(contacts)
  } catch (error) {
    console.error('[CRM] contacts GET error:', error)
    return NextResponse.json({ error: 'Failed to load contacts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(Permission.CRM_MANAGE_CONTACTS, req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()
    const { customerId, firstName, lastName, role, email, phone, isPrimary, note } = body

    if (!customerId?.trim()) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    if (!firstName?.trim())  return NextResponse.json({ error: 'firstName required' }, { status: 400 })

    if (isPrimary) {
      await prisma.crmContact.updateMany({ where: { customerId, isPrimary: true }, data: { isPrimary: false } })
    }

    const contact = await prisma.crmContact.create({
      data: {
        customerId,
        firstName: firstName.trim(),
        lastName:  lastName?.trim() || null,
        role:      role?.trim()     || null,
        email:     email?.trim()    || null,
        phone:     phone?.trim()    || null,
        isPrimary: isPrimary ?? false,
        note:      note?.trim()     || null,
        createdById: guard.ctx.userId,
      },
    })

    await createAuditLog({
      userId: guard.ctx.userId, username: guard.ctx.username, role: guard.ctx.roles[0] ?? null,
      actionType: 'CREATE', entityName: 'CrmContact', entityId: contact.id,
      newValue: JSON.stringify({ firstName, customerId }), module: 'crm', ipAddress: guard.ctx.ipAddress,
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('[CRM] contacts POST error:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
