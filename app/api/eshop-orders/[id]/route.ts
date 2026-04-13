// PATCH /api/eshop-orders/[id]
// Aktualizace statusu eshop objednávky (shipped, delivered, cancelled)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED_STATUSES = ['paid', 'shipped', 'delivered', 'cancelled']

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status } = body

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Neplatný status. Povolené hodnoty: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Zkontroluj, že objednávka existuje a je eshop objednávka
    const existing = await prisma.customerOrder.findFirst({
      where: { id: params.id, source: 'eshop' },
      select: { id: true, status: true }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    const updated = await prisma.customerOrder.update({
      where: { id: params.id },
      data: {
        status,
        shippedAt: status === 'shipped' ? new Date() : undefined,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        shippedAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[EshopOrders] Chyba při aktualizaci statusu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat objednávku' },
      { status: 500 }
    )
  }
}
