// PATCH  /api/customers/[id]  — update customer  (EDIT_CUSTOMERS)
// DELETE /api/customers/[id]  — delete customer   (DELETE_CUSTOMERS)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog, diffAndLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requirePermission(Permission.EDIT_CUSTOMERS, req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Jméno odběratele je povinné' }, { status: 400 })
    }

    // Snapshot before update for field-level audit diff
    const before = await prisma.customer.findUnique({ where: { id: params.id } })
    if (!before) {
      return NextResponse.json({ error: 'Odběratel nebyl nalezen' }, { status: 404 })
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name:        body.name.trim(),
        entityType:  body.entityType  || 'company',
        contact:     body.contact     || null,
        email:       body.email       || null,
        phone:       body.phone       || null,
        ico:         body.ico         || null,
        dic:         body.dic         || null,
        bankAccount: body.bankAccount || null,
        address:     body.address     || null,
        note:        body.note        || null,
      },
    })

    await Promise.all(
      diffAndLog(
        {
          userId:    guard.ctx.userId,
          username:  guard.ctx.username,
          role:      guard.ctx.roles[0] ?? null,
          entityName: 'Customer',
          entityId:  params.id,
          module:    'customers',
          ipAddress: guard.ctx.ipAddress,
        },
        before as any,
        customer as any,
      )
    )

    return NextResponse.json(customer)
  } catch (error: any) {
    console.error('Chyba při aktualizaci odběratele:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Odběratel nebyl nalezen' }, { status: 404 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Odběratel se stejným názvem již existuje' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat odběratele' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requirePermission(Permission.DELETE_CUSTOMERS, req)
  if (!guard.ok) return guard.error

  try {
    const customer = await prisma.customer.findUnique({ where: { id: params.id } })
    if (!customer) {
      return NextResponse.json({ error: 'Odběratel nebyl nalezen' }, { status: 404 })
    }

    await prisma.customer.delete({ where: { id: params.id } })

    await createAuditLog({
      userId:     guard.ctx.userId,
      username:   guard.ctx.username,
      role:       guard.ctx.roles[0] ?? null,
      actionType: 'DELETE',
      entityName: 'Customer',
      entityId:   params.id,
      oldValue:   JSON.stringify({ name: customer.name }),
      module:     'customers',
      ipAddress:  guard.ctx.ipAddress,
    })

    return NextResponse.json({ message: 'Odběratel byl smazán' })
  } catch (error: any) {
    console.error('Chyba při mazání odběratele:', error)
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Nelze smazat odběratele, který má připojené záznamy' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Nepodařilo se smazat odběratele' }, { status: 500 })
  }
}
