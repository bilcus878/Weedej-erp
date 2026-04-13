// API Endpoint pro seznam očekávaných výdejek
// URL: /api/customer-orders/pending

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customer-orders/pending - Získat objednávky čekající na expedici
export async function GET() {
  try {
    // Načti objednávky, které jsou zaplacené a nemají ještě výdejku
    const orders = await prisma.customerOrder.findMany({
      where: {
        status: 'paid',
        deliveryNotes: {
          none: {} // Ještě nemá výdejku
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        orderDate: 'desc'
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Chyba při načítání očekávaných výdejek:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst očekávané výdejky' },
      { status: 500 }
    )
  }
}
