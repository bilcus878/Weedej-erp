// API Endpoint pro přípravu k expedici (vytvoření výdejky DRAFT)
// URL: /api/customer-orders/[id]/ship
// Workflow: Vytvoří DeliveryNote se statusem "draft" - čeká na vyskladnění

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/customer-orders/[id]/ship - Připravit k expedici (vytvoří výdejku draft)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Načti objednávku
    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        deliveryNotes: true // ✅ Changed from deliveryNote to deliveryNotes
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    // Kontrola, že objednávka je zaplacená
    if (order.status !== 'paid' && order.status !== 'processing') {
      return NextResponse.json(
        { error: 'Objednávka musí být zaplacena' },
        { status: 400 }
      )
    }

    // Kontrola, že ještě zbývá něco k vyskladnění
    const hasRemainingItems = order.items.some(item =>
      Number(item.shippedQuantity || 0) < Number(item.quantity)
    )

    if (!hasRemainingItems) {
      return NextResponse.json(
        { error: 'Všechny položky už byly vyskladněny' },
        { status: 400 }
      )
    }

    // Vytvoř výdejku pomocí helper funkce
    const { createDeliveryNoteFromCustomerOrder } = await import('@/lib/createDeliveryNote')
    const deliveryNote = await createDeliveryNoteFromCustomerOrder(order.id)

    // Načti aktualizovanou objednávku
    const updatedOrder = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        deliveryNotes: { // ✅ Changed from deliveryNote to deliveryNotes
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Výdejka ${deliveryNote.deliveryNumber} připravena k vyskladnění`,
      deliveryNote,
      order: updatedOrder
    })
  } catch (error) {
    console.error('Chyba při přípravě k expedici:', error)
    return NextResponse.json(
      {
        error: 'Nepodařilo se připravit objednávku k expedici',
        details: error instanceof Error ? error.message : 'Neznámá chyba'
      },
      { status: 500 }
    )
  }
}
