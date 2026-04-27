// GET /api/eshop-orders
// Vrátí všechny objednávky přijaté z e-shopu (source = 'eshop')

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const orders = await prisma.customerOrder.findMany({
      where: { source: 'eshop' },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, unit: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        issuedInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            paymentType: true,
            paymentStatus: true,
            status: true,
            invoiceDate: true,
            dueDate: true,
            variableSymbol: true,
            constantSymbol: true,
            specificSymbol: true,
          }
        },
        EshopUser: {
          select: { id: true, email: true, name: true, phone: true }
        },
        deliveryNotes: {
          select: {
            id: true,
            deliveryNumber: true,
            deliveryDate: true,
            status: true,
            processedAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                unit: true,
                productId: true,
                productName: true,
                inventoryItemId: true,
                price: true,
                priceWithVat: true,
                vatRate: true,
                vatAmount: true,
                product: {
                  select: { id: true, name: true, price: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
      },
      orderBy: { orderDate: 'desc' }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('[EshopOrders] Chyba při načítání objednávek:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst eshop objednávky' },
      { status: 500 }
    )
  }
}
