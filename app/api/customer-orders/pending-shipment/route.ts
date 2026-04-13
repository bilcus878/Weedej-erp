// API Endpoint pro objednávky čekající na vyskladnění
// URL: /api/customer-orders/pending-shipment
// Vrací všechny zaplacené objednávky, které ještě nejsou kompletně vyskladněné

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customer-orders/pending-shipment - Získat objednávky čekající na vyskladnění
export async function GET() {
  try {
    // Načti všechny objednávky se statusem 'paid' nebo 'processing'
    const orders = await prisma.customerOrder.findMany({
      where: {
        status: {
          in: ['paid', 'processing']
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        deliveryNotes: true
      },
      orderBy: {
        orderDate: 'desc'
      }
    })

    // Filtruj jen objednávky, které mají ještě něco k vyskladnění
    const pendingOrders = orders.filter(order => {
      // Zkontroluj, jestli ALESPOŇ JEDNA položka má zbývající množství
      const hasRemainingItems = order.items.some(item => {
        const shipped = Number(item.shippedQuantity || 0)
        const ordered = Number(item.quantity)
        return shipped < ordered
      })

      return hasRemainingItems
    })

    return NextResponse.json(pendingOrders)
  } catch (error) {
    console.error('Chyba při načítání objednávek čekajících na vyskladnění:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst objednávky' },
      { status: 500 }
    )
  }
}
