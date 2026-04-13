// API Endpoint pro seznam očekávaných objednávek (s remaining quantity)
// URL: /api/purchase-orders/pending

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/purchase-orders/pending - Získat objednávky čekající na příjem
export async function GET() {
  try {
    // Načti objednávky ve stavu pending, confirmed nebo partially_received
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        status: {
          in: ['pending', 'confirmed', 'partially_received']
        }
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        },
        invoice: true // Načti fakturu
      },
      orderBy: {
        orderDate: 'desc'
      }
    })

    // Pro každou objednávku vypočítej remaining quantity
    const ordersWithRemaining = orders.map(order => {
      const itemsWithRemaining = order.items.map(item => {
        const ordered = Number(item.quantity)
        const alreadyReceived = Number(item.alreadyReceivedQuantity)
        const remaining = ordered - alreadyReceived

        return {
          ...item,
          quantity: item.quantity.toString(),
          alreadyReceivedQuantity: item.alreadyReceivedQuantity.toString(),
          remainingQuantity: remaining,
          expectedPrice: item.expectedPrice ? item.expectedPrice.toString() : null
        }
      })

      // Zjisti, jestli má objednávka něco zbývajícího
      const hasRemaining = itemsWithRemaining.some(item => item.remainingQuantity > 0)

      return {
        ...order,
        items: itemsWithRemaining,
        hasRemaining
      }
    })

    // Vrať jen objednávky, které mají něco zbývajícího
    const filtered = ordersWithRemaining.filter(o => o.hasRemaining)

    return NextResponse.json(filtered)
  } catch (error: any) {
    const detail = error?.message || String(error)
    console.error('[PendingOrders] Chyba při načítání:', detail, error)
    return NextResponse.json(
      { error: `Nepodařilo se načíst očekávané objednávky: ${detail}` },
      { status: 500 }
    )
  }
}
