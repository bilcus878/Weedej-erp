// API Endpoint pro skladovou evidenci
// URL: http://localhost:3000/api/inventory

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/inventory - Získat všechny skladové položky
export async function GET() {
  try {
    const inventoryItems = await prisma.inventoryItem.findMany({
      include: {
        product: true,
        supplier: true,
      },
      orderBy: {
        date: 'desc', // Nejnovější nahoře
      },
    })

    return NextResponse.json(inventoryItems)
  } catch (error) {
    console.error('Chyba při načítání skladu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst skladové položky' },
      { status: 500 }
    )
  }
}

// POST /api/inventory - Naskladnit zboží
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      productId,
      quantity,
      unit,
      supplierId,
      purchasePrice,
      date,
      note,
    } = body

    // Validace
    if (!productId || !quantity || !unit || !purchasePrice) {
      return NextResponse.json(
        { error: 'Chybí povinná pole (productId, quantity, unit, purchasePrice)' },
        { status: 400 }
      )
    }

    // Kontrola že produkt existuje
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produkt nenalezen' },
        { status: 404 }
      )
    }

    // Vytvořit novou skladovou položku
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        productId,
        quantity: Number(quantity),
        unit,
        supplierId: supplierId || null,
        purchasePrice: Number(purchasePrice),
        date: date ? new Date(date) : new Date(),
        note,
      },
      include: {
        product: true,
        supplier: true,
      },
    })

    return NextResponse.json(inventoryItem, { status: 201 })
  } catch (error) {
    console.error('Chyba při naskladnění:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se naskladnit zboží' },
      { status: 500 }
    )
  }
}
