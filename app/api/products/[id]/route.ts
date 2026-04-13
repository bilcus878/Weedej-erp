// API Endpoint pro jeden konkrétní produkt
// [id] znamená dynamický parametr - např. /api/products/123
// URL: http://localhost:3000/api/products/[id]

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/[id] - Získat jeden produkt
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: {
        id: params.id,
      },
      include: {
        // ✅ NOVÝ SYSTÉM (2026): Zobrazujeme JEN InventoryItems
        // Všechny pohyby skladu (příjmy i výdeje) jsou v InventoryItems
        inventoryItems: {
          include: {
            supplier: true,
            transaction: {
              include: {
                issuedInvoice: true, // Pro vystavené faktury ze SumUp transakcí
              },
            },
            receipt: {
              include: {
                receivedInvoice: true, // Pro přijaté faktury přes příjemky
                purchaseOrder: true, // Pro objednávky vydané
              },
            },
            // ✅ Propojení s výdejkami (přes DeliveryNoteItem -> DeliveryNote)
            deliveryNoteItems: {
              include: {
                deliveryNote: {
                  include: {
                    transaction: true, // Pro SumUp výdejky
                    customerOrder: {
                      include: {
                        issuedInvoice: true, // Pro vystavené faktury z objednávek
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produkt nenalezen' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Chyba při načítání produktu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst produkt' },
      { status: 500 }
    )
  }
}

// PATCH /api/products/[id] - Aktualizovat produkt
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const product = await prisma.product.update({
      where: {
        id: params.id,
      },
      data: body,
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Chyba při aktualizaci produktu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat produkt' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Smazat produkt
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.product.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ message: 'Produkt smazán' })
  } catch (error) {
    console.error('Chyba při mazání produktu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat produkt' },
      { status: 500 }
    )
  }
}
