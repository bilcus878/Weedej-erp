// API Endpoint pro objednávky čekající na vyskladnění
// URL: /api/customer-orders/pending-shipment
// Vrací všechny zaplacené objednávky, které ještě nejsou kompletně vyskladněné

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isItemFullyShipped } from '@/lib/variantConversion'

export const dynamic = 'force-dynamic'

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
          select: {
            id:              true,
            productId:       true,
            productName:     true,
            quantity:        true,
            shippedQuantity: true,
            shippedBaseQty:  true,
            variantValue:    true,
            variantUnit:     true,
            unit:            true,
            price:           true,
            priceWithVat:    true,
            vatAmount:       true,
            vatRate:         true,
            product:         { select: { id: true, name: true, vatRate: true } },
          },
        },
        deliveryNotes: true
      },
      orderBy: {
        orderDate: 'desc'
      }
    })

    // Filtruj jen objednávky, které mají ještě zbožové položky k vyskladnění
    // (null productId = doprava/sleva — nikdy se nevyskladňuje, nesmí blokovat dokončení)
    const pendingOrders = orders.filter(order => {
      const goodsItems = order.items.filter(item => item.productId !== null)
      if (goodsItems.length === 0) return false
      return goodsItems.some(item => !isItemFullyShipped({
        quantity:        Number(item.quantity),
        shippedQuantity: Number(item.shippedQuantity),
        shippedBaseQty:  Number(item.shippedBaseQty),
        variantValue:    item.variantValue != null ? Number(item.variantValue) : null,
        variantUnit:     item.variantUnit,
        unit:            item.unit,
      }))
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
