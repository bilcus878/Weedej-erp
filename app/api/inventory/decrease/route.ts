// API Endpoint pro ruční snížení stavu skladu (manko)
// URL: http://localhost:3000/api/inventory/decrease

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/inventory/decrease - Vytvořit záznam o manku (záporné množství)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId, quantity, note, date } = body

    if (!productId || !quantity) {
      return NextResponse.json(
        { error: 'Chybí povinná pole' },
        { status: 400 }
      )
    }

    // Získej produkt pro zjištění jednotky
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produkt nenalezen' },
        { status: 404 }
      )
    }

    // Vytvoř nový záznam se ZÁPORNÝM množstvím
    // Tím se zaznamená manko a automaticky se odečte od celkového stavu
    await prisma.inventoryItem.create({
      data: {
        productId,
        quantity: -Number(quantity), // ZÁPORNÉ množství!
        unit: product.unit,
        purchasePrice: 0, // Pro manko není relevantní
        date: date ? new Date(date) : new Date(),
        note: note || 'Manuální úprava - manko',
      },
    })

    return NextResponse.json({
      message: 'Manko zaznamenáno',
      decreasedQuantity: Number(quantity)
    })
  } catch (error) {
    console.error('Chyba při zaznamenávání manka:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se zaznamenat manko' },
      { status: 500 }
    )
  }
}
