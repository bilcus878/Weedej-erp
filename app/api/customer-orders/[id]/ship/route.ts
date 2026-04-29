// API Endpoint pro přípravu k expedici (vytvoření výdejky DRAFT)
// URL: /api/customer-orders/[id]/ship
// Workflow: Vytvoří DeliveryNote se statusem "draft" - čeká na vyskladnění

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { archiveCustomerOrder, archiveAsync } from '@/lib/documents/DocumentArchiveService'

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

    // Pokud už existuje draft výdejka, není potřeba vytvářet novou
    // (e-shop sync ji vytváří automaticky při přijetí objednávky)
    const existingDraft = order.deliveryNotes.find((dn: any) => dn.status === 'draft')
    if (existingDraft) {
      return NextResponse.json({
        success: true,
        message: `Výdejka ${existingDraft.deliveryNumber} již existuje — přejdi na výdejky`,
        deliveryNote: existingDraft,
        order,
      })
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

    archiveAsync(() => archiveCustomerOrder(params.id), `CustomerOrder ${order.orderNumber} ship`)
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
