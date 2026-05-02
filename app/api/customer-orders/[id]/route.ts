// API Endpoint pro jednu objednávku zákazníka
// URL: /api/customer-orders/[id]

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/platform/auth/auth'
import { prisma } from '@/lib/platform/db/prisma'
import { CustomerOrderStatus, CUSTOMER_ORDER_TRANSITIONS } from '@/lib/shared/constants/customerOrder'
import { createAuditLog, diffAndLog } from '@/lib/platform/audit/auditService'

export const dynamic = 'force-dynamic'

// GET /api/customer-orders/[id] - Získat detail objednávky
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        reservations: true,
        deliveryNotes: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        issuedInvoice: true,
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Chyba při načítání objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst objednávku' },
      { status: 500 }
    )
  }
}

// PATCH /api/customer-orders/[id] - Upravit objednávku
// NOTE: Status changes must go through the dedicated sub-routes:
//   POST /[id]/mark-paid, /[id]/ship, /[id]/cancel
// Only non-financial metadata fields are accepted here.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId   = (session?.user as any)?.id   ?? null
    const username = session?.user?.email ?? session?.user?.name ?? null
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip') ?? null

    const body = await request.json()
    const { status, customerName, customerEmail, customerPhone, customerAddress, note } = body

    // Status changes through PATCH are only allowed for simple, non-inventory-affecting transitions.
    // Any attempt to set a status that requires financial or stock side-effects must use
    // the dedicated action routes (mark-paid, ship, cancel).
    let validatedStatus: string | undefined
    let beforeStatus: string | undefined
    if (status !== undefined) {
      const existing = await prisma.customerOrder.findUnique({
        where: { id: params.id },
        select: { id: true, status: true },
      })
      if (!existing) return NextResponse.json({ error: 'Objednávka nenalezena' }, { status: 404 })

      const currentStatus = existing.status as CustomerOrderStatus
      const allowedNext = CUSTOMER_ORDER_TRANSITIONS[currentStatus] ?? []
      if (!(allowedNext as string[]).includes(status)) {
        return NextResponse.json(
          { error: `Neplatný přechod stavu: ${currentStatus} → ${status}. Použij příslušný akční endpoint.` },
          { status: 422 }
        )
      }
      validatedStatus = status
      beforeStatus = currentStatus
    }

    const before = status === undefined ? await prisma.customerOrder.findUnique({
      where: { id: params.id },
      select: { customerName: true, customerEmail: true, customerPhone: true, customerAddress: true, note: true },
    }) : null

    const order = await prisma.customerOrder.update({
      where: { id: params.id },
      data: {
        status:          validatedStatus,
        customerName:    customerName    !== undefined ? customerName    : undefined,
        customerEmail:   customerEmail   !== undefined ? customerEmail   : undefined,
        customerPhone:   customerPhone   !== undefined ? customerPhone   : undefined,
        customerAddress: customerAddress !== undefined ? customerAddress : undefined,
        note:            note            !== undefined ? note            : undefined,
      },
      include: {
        customer: true,
        items: { include: { product: true } },
        reservations: true,
      }
    })

    const auditBase = { userId, username, ipAddress, entityName: 'CustomerOrder', entityId: params.id, module: 'customer-orders' }
    if (validatedStatus !== undefined) {
      await createAuditLog({ ...auditBase, actionType: 'UPDATE', fieldName: 'status', oldValue: beforeStatus ?? null, newValue: validatedStatus })
    } else if (before) {
      await Promise.all(diffAndLog(auditBase, before as any, {
        customerName:    order.customerName,
        customerEmail:   order.customerEmail,
        customerPhone:   order.customerPhone,
        customerAddress: order.customerAddress,
        note:            order.note,
      } as any))
    }

    return NextResponse.json(order)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Objednávka nenalezena' }, { status: 404 })
    }
    console.error('Chyba při aktualizaci objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat objednávku' },
      { status: 500 }
    )
  }
}

// DELETE /api/customer-orders/[id] - Smazat objednávku
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Smazání objednávky automaticky smaže i položky a rezervace (Cascade)
    await prisma.customerOrder.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Objednávka smazána' })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Objednávka nenalezena' }, { status: 404 })
    }
    console.error('Chyba při mazání objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat objednávku' },
      { status: 500 }
    )
  }
}
