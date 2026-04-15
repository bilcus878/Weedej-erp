// API Endpoint pro produkty
// V Next.js je API endpoint = soubor v /app/api/něco/route.ts
// Tento soubor je dostupný na URL: http://localhost:3000/api/products

import { prisma } from '@/lib/prisma'
import { fetchProducts } from '@/lib/sumup'

export const dynamic = 'force-dynamic'

// GET /api/products - Získat všechny produkty z databáze
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        name: 'asc', // Seřadit podle názvu A-Z
      },
      include: {
        // Přidat kategorii
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        // Přidat i součet skladových zásob
        inventoryItems: {
          select: {
            quantity: true,
            unit: true,
          },
        },
        // Přidat transakce pro odečtení prodaného množství
        transactionItems: {
          select: {
            quantity: true,
          },
        },
      },
    })

    // Vypočítat celkové množství na skladě pro každý produkt
    // Aktuální stav = Naskladněno - Prodáno
    const productsWithStock = products.map(product => {
      const totalStocked = product.inventoryItems.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      )

      const totalSold = product.transactionItems.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      )

      const stockQuantity = totalStocked - totalSold

      return {
        ...product,
        stockQuantity,
        inventoryItems: undefined, // Odebrat inventoryItems z odpovědi
        transactionItems: undefined, // Odebrat transactionItems z odpovědi
      }
    })

    return NextResponse.json(productsWithStock)
  } catch (error) {
    console.error('Chyba při načítání produktů:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst produkty' },
      { status: 500 }
    )
  }
}

// POST /api/products - Vytvořit nový produkt ručně
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, price, purchasePrice, unit, categoryId, vatRate } = body

    // Validace
    if (!name || !price || !unit) {
      return NextResponse.json(
        { error: 'Chybí povinná pole (name, price, unit)' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name,
        price,
        purchasePrice: purchasePrice || null,
        vatRate: vatRate != null ? Number(vatRate) : 21,
        unit,
        categoryId: categoryId || null,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření produktu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit produkt' },
      { status: 500 }
    )
  }
}

// DELETE /api/products - Hromadné mazání produktů
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Chybí seznam ID produktů' },
        { status: 400 }
      )
    }

    // Smaž produkty podle ID
    await prisma.product.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })

    return NextResponse.json({ message: `Smazáno ${ids.length} produktů` })
  } catch (error) {
    console.error('Chyba při mazání produktů:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat produkty' },
      { status: 500 }
    )
  }
}
