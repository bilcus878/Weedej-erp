// API Endpoint pro výdejky (Delivery Notes)
// URL: /api/delivery-notes

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/platform/db/prisma'
import { getNextDocumentNumber } from '@/lib/shared/documents/documentSeries'
import { archiveDeliveryNote, archiveAsync } from '@/lib/platform/documents/DocumentArchiveService'

export const dynamic = 'force-dynamic'

// GET /api/delivery-notes - Získat všechny výdejky
export async function GET() {
  try {
    const deliveryNotes = await prisma.deliveryNote.findMany({
      include: {
        customer: true,
        transaction: true,
        customerOrder: {
          include: {
            issuedInvoice: true
          }
        },
        issuedInvoice: true, // Načti fakturu přímo na výdejce (pro transakce)
        items: {
          include: {
            product: true,
            inventoryItem: true // Include inventory movement link
          }
        }
      },
      orderBy: {
        deliveryNumber: 'desc' // Nejvyšší číslo nahoře
      }
    })

    return NextResponse.json(deliveryNotes)
  } catch (error) {
    console.error('Chyba při načítání výdejek:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst výdejky' },
      { status: 500 }
    )
  }
}

// POST /api/delivery-notes - Vytvořit novou výdejku (ruční)
// deliveryNumber is NEVER accepted from the client — always generated server-side inside the transaction.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      customerId,
      customerName,
      deliveryDate,
      note,
      items,
      autoProcess, // Automaticky zpracovat (vyskladnit)?
    } = body

    // Validace
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Chybí povinná pole (items)' },
        { status: 400 }
      )
    }

    // Načti nastavení pro kontrolu záporného skladu
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    const allowNegativeStock = settings?.allowNegativeStock || false

    // Pokud má být automaticky zpracováno, kontroluj sklad PŘED transakcí
    if (autoProcess && !allowNegativeStock) {
      const { canDeliverQuantity } = await import('@/lib/shared/inventory/stockMovement')

      for (const item of items) {
        if (item.productId) {
          const check = await canDeliverQuantity(
            item.productId,
            Number(item.quantity),
            allowNegativeStock
          )

          if (!check.canDeliver) {
            return NextResponse.json(
              { error: check.message || 'Nedostatečný sklad' },
              { status: 400 }
            )
          }
        }
      }
    }

    // Vytvoř výdejku v transakci (ON-COMMIT číslování)
    const deliveryNote = await prisma.$transaction(async (tx) => {
      // Document number generated server-side — never from client input
      const deliveryDate_ = deliveryDate ? new Date(deliveryDate) : new Date()
      const deliveryNumber = await getNextDocumentNumber('delivery-note', tx, deliveryDate_)

      return tx.deliveryNote.create({
        data: {
          deliveryNumber,
          customerId: customerId || null,
          customerName: customerName || null,
          deliveryDate: deliveryDate_,
          note: note || null,
          // auto-processed notes use 'active' (stock movement expected from /process endpoint or caller)
          status: autoProcess ? 'active' : 'draft',
          processedAt: autoProcess ? new Date() : null,
          items: {
            create: items.map((item: any) => ({
              productId:   item.isManual ? null : item.productId,
              productName: item.isManual ? item.productName : null,
              quantity:    Number(item.quantity),
              unit:        item.unit,
            }))
          }
        },
        include: {
          customer: true,
          items: { include: { product: true } }
        }
      })
    })

    archiveAsync(() => archiveDeliveryNote(deliveryNote.id), `DeliveryNote ${deliveryNote.deliveryNumber} draft`)
    return NextResponse.json(deliveryNote, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření výdejky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit výdejku' },
      { status: 500 }
    )
  }
}
