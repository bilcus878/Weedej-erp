/**
 * Returns-specific order search endpoint.
 *
 * Searches across ALL CustomerOrders (both internal and e-shop source)
 * by order number OR customer name/email. Returns only the fields
 * the returns creation flow needs — no sensitive data, minimal payload.
 */

import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { prisma }            from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  try {
    const where = q.length >= 2
      ? {
          OR: [
            { orderNumber:  { contains: q, mode: 'insensitive' as const } },
            { customerName: { contains: q, mode: 'insensitive' as const } },
            { customerEmail:{ contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const orders = await prisma.customerOrder.findMany({
      where,
      include: {
        items: {
          select: {
            id:          true,
            productId:   true,
            productName: true,
            quantity:    true,
            unit:        true,
            price:       true,
            priceWithVat:true,
            vatRate:     true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
      take:    50,  // cap results — this is a picker, not a full list
    })

    // Serialize Decimal fields as numbers so the client never receives strings
    const mapped = orders.map(order => ({
      id:              order.id,
      orderNumber:     order.orderNumber,
      orderDate:       order.orderDate,
      status:          order.status,
      source:          order.source,
      totalAmount:     Number(order.totalAmount),
      customerName:    order.customerName,
      customerEmail:   order.customerEmail,
      customerPhone:   order.customerPhone,
      customerAddress: order.customerAddress,
      items: order.items.map(item => ({
        id:           item.id,
        productId:    item.productId,
        productName:  item.productName,
        quantity:     Number(item.quantity),
        unit:         item.unit,
        price:        Number(item.price),
        vatRate:      Number(item.vatRate),
        // Use priceWithVat if it was explicitly set (> 0),
        // otherwise let the client compute it from price + vatRate.
        priceWithVat: Number(item.priceWithVat) > 0
          ? Number(item.priceWithVat)
          : null,
      })),
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('[GET /api/returns/search-orders]', error)
    return NextResponse.json({ error: 'Chyba při vyhledávání objednávek' }, { status: 500 })
  }
}
