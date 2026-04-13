// API Endpoint pro jednu objednávku
// URL: /api/purchase-orders/[id]

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/purchase-orders/[id] - Získat detail objednávky
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        },
        receipts: {
          include: {
            items: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Chyba při načítání objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst objednávku' },
      { status: 500 }
    )
  }
}

// PATCH /api/purchase-orders/[id] - Upravit objednávku
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { items, expectedDate, note, status } = body

    // Pokud se mění položky, přepsat je
    if (items) {
      // Smaž staré položky
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: params.id }
      })

      // Vytvoř nové položky
      for (const item of items) {
        await prisma.purchaseOrderItem.create({
          data: {
            purchaseOrderId: params.id,
            productId: item.isManual ? null : item.productId,
            productName: item.isManual ? item.productName : null,
            quantity: Number(item.quantity),
            unit: item.unit,
            expectedPrice: item.expectedPrice ? Number(item.expectedPrice) : null
          }
        })
      }
    }

    // Aktualizuj objednávku
    const order = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        note: note !== undefined ? note : undefined,
        status: status !== undefined ? status : undefined
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        },
        receipts: true
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Chyba při aktualizaci objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat objednávku' },
      { status: 500 }
    )
  }
}

// DELETE /api/purchase-orders/[id] - Smazat objednávku
// POZOR: Při smazání objednávky se CASCADE automaticky smaže i navázaná faktura!
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Kontrola, že objednávka nemá příjemky
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        receipts: true,
        invoice: true // Načti fakturu pro logování
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    if (order.receipts.length > 0) {
      return NextResponse.json(
        { error: 'Nelze smazat objednávku, která má příjemky. Použij STORNO místo mazání.' },
        { status: 400 }
      )
    }

    // Smaž objednávku (CASCADE smaže i fakturu)
    await prisma.purchaseOrder.delete({
      where: { id: params.id }
    })

    if (order.invoice) {
      console.log(`✓ Smazána objednávka ${order.orderNumber} + faktura ${order.invoice.invoiceNumber} (CASCADE)`)
    } else {
      console.log(`✓ Smazána objednávka ${order.orderNumber}`)
    }

    return NextResponse.json({ message: 'Objednávka (a navázaná faktura) byla smazána' })
  } catch (error) {
    console.error('Chyba při mazání objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat objednávku' },
      { status: 500 }
    )
  }
}
