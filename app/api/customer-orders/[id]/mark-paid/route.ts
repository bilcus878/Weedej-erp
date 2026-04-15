// API Endpoint pro označení objednávky jako zaplacené
// URL: /api/customer-orders/[id]/mark-paid

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/customer-orders/[id]/mark-paid - Označit objednávku jako zaplacenou
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { sumupTransactionId } = body

    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    if (order.status === 'cancelled' || order.status === 'storno') {
      return NextResponse.json(
        { error: 'Nelze označit zrušenou/stornovanou objednávku jako zaplacenou' },
        { status: 400 }
      )
    }

    if (order.status === 'paid' || order.status === 'shipped') {
      return NextResponse.json(
        { error: 'Objednávka již byla zaplacena' },
        { status: 400 }
      )
    }

    const updated = await prisma.customerOrder.update({
      where: { id: params.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        sumupTransactionId: sumupTransactionId || undefined
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

    console.log(`✓ Objednávka ${order.orderNumber} označena jako zaplacená`)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Chyba při označování objednávky jako zaplacené:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se označit objednávku jako zaplacenou' },
      { status: 500 }
    )
  }
}
