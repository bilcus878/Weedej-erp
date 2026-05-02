// API Endpoint pro zrušení objednávky
// URL: /api/customer-orders/[id]/cancel

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/platform/auth/auth'
import { prisma } from '@/lib/platform/db/prisma'
import { cancelReservations } from '@/lib/features/eshop/reservationManagement'
import { createAuditLog } from '@/lib/platform/audit/auditService'

export const dynamic = 'force-dynamic'

// POST /api/customer-orders/[id]/cancel - Zrušit objednávku
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId   = (session?.user as any)?.id   ?? null
    const username = session?.user?.email ?? session?.user?.name ?? null
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip') ?? null

    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    if (order.status === 'shipped') {
      return NextResponse.json(
        { error: 'Nelze zrušit odeslanou objednávku' },
        { status: 400 }
      )
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Objednávka již byla zrušena' },
        { status: 400 }
      )
    }

    // Transakce: Zruš objednávku a všechny rezervace
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Změň status objednávky
      const updatedOrder = await tx.customerOrder.update({
        where: { id: params.id },
        data: {
          status: 'cancelled'
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          },
          reservations: true
        }
      })

      // 2. Zruš všechny aktivní rezervace — atomicky ve stejné transakci
      await cancelReservations(params.id, tx)

      return updatedOrder
    })

    console.log(`✓ Objednávka ${order.orderNumber} zrušena, rezervace uvolněny`)

    await createAuditLog({
      userId, username, ipAddress,
      actionType: 'UPDATE',
      entityName: 'CustomerOrder',
      entityId:   params.id,
      fieldName:  'status',
      oldValue:   order.status,
      newValue:   'cancelled',
      module:     'customer-orders',
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Chyba při rušení objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se zrušit objednávku' },
      { status: 500 }
    )
  }
}
