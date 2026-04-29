// GET  /api/customers  — list all customers  (VIEW_CUSTOMERS)
// POST /api/customers  — create customer     (CREATE_CUSTOMERS)
//
// Reference implementation: shows the standard RBAC + audit pattern.
// Apply the same pattern to other modules by replacing the Permission constant
// and entity name.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.VIEW_CUSTOMERS, req)
  if (!guard.ok) return guard.error

  try {
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(customers)
  } catch (error) {
    console.error('Chyba při načítání odběratelů:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst odběratele' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(Permission.CREATE_CUSTOMERS, req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()
    const { name, entityType, contact, email, phone, ico, dic, bankAccount, address, note } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Jméno odběratele je povinné' }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        name:        name.trim(),
        entityType:  entityType  || 'company',
        contact:     contact     || null,
        email:       email       || null,
        phone:       phone       || null,
        ico:         ico         || null,
        dic:         dic         || null,
        bankAccount: bankAccount || null,
        address:     address     || null,
        note:        note        || null,
      },
    })

    await createAuditLog({
      userId:     guard.ctx.userId,
      username:   guard.ctx.username,
      role:       guard.ctx.roles[0] ?? null,
      actionType: 'CREATE',
      entityName: 'Customer',
      entityId:   customer.id,
      newValue:   JSON.stringify({ name: customer.name, entityType: customer.entityType }),
      module:     'customers',
      ipAddress:  guard.ctx.ipAddress,
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    console.error('Chyba při vytváření odběratele:', error)
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return NextResponse.json({ error: 'Odběratel se stejným názvem již existuje' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Nepodařilo se vytvořit odběratele' }, { status: 500 })
  }
}
