// API Endpoint pro zrušení objednávky
// URL: /api/customer-orders/[id]/cancel

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cancelReservations } from '@/lib/reservationManagement'

export const dynamic = 'force-dynamic'

// POST /api/customer-orders/[id]/cancel - Zrušit objednávku
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

      // 2. Zruš všechny aktivní rezervace
      await cancelReservations(params.id)

      return updatedOrder
    })

    console.log(`✓ Objednávka ${order.orderNumber} zrušena, rezervace uvolněny`)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Chyba při rušení objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se zrušit objednávku' },
      { status: 500 }
    )
  }
}
