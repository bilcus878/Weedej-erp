// API Endpoint pro výdejky (Delivery Notes)
// URL: /api/delivery-notes

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      deliveryNumber,
      customerId,
      customerName,
      deliveryDate,
      note,
      items,
      autoProcess // Automaticky zpracovat (vyskladnit)?
    } = body

    // Validace
    if (!deliveryNumber || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Chybí povinná pole (deliveryNumber, items)' },
        { status: 400 }
      )
    }

    // Načti nastavení pro kontrolu záporného skladu
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    const allowNegativeStock = settings?.allowNegativeStock || false

    // Pokud má být automaticky zpracováno, kontroluj sklad
    if (autoProcess && !allowNegativeStock) {
      const { canDeliverQuantity } = await import('@/lib/stockCalculation')

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

    // Vytvoř výdejku
    const deliveryNote = await prisma.deliveryNote.create({
      data: {
        deliveryNumber,
        customerId: customerId || null,
        customerName: customerName || null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        note: note || null,
        status: autoProcess ? 'delivered' : 'draft',
        processedAt: autoProcess ? new Date() : null,
        items: {
          create: items.map((item: any) => ({
            productId: item.isManual ? null : item.productId,
            productName: item.isManual ? item.productName : null,
            quantity: Number(item.quantity),
            unit: item.unit
          }))
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json(deliveryNote, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření výdejky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit výdejku' },
      { status: 500 }
    )
  }
}
