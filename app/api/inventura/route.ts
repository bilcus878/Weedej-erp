// API pro inventury
// GET - seznam inventur
// POST - vytvořit novou inventuru

import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentSeries'

export const dynamic = 'force-dynamic'

// GET /api/inventura - seznam inventur
export async function GET() {
  try {
    const inventury = await prisma.inventura.findMany({
      orderBy: { inventuraDate: 'desc' },
      include: {
        _count: {
          select: { items: true }
        }
      }
    })

    return NextResponse.json(inventury)
  } catch (error) {
    console.error('Chyba při načítání inventur:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst inventury' },
      { status: 500 }
    )
  }
}

// POST /api/inventura - vytvořit novou inventuru
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, note } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Položky inventury jsou povinné' },
        { status: 400 }
      )
    }

    // Spočítej statistiky
    let checkedProducts = 0
    let differencesCount = 0
    let surplusCount = 0
    let shortageCount = 0

    const processedItems = items.map((item: any) => {
      const systemStock = parseFloat(item.systemStock) || 0
      const actualStock = parseFloat(item.actualStock)

      // Pokud není zadána skutečná hodnota, použij systémovou
      const finalActualStock = isNaN(actualStock) ? systemStock : actualStock
      const difference = finalActualStock - systemStock

      let differenceType = 'none'
      if (difference > 0) {
        differenceType = 'surplus'
        surplusCount++
        differencesCount++
      } else if (difference < 0) {
        differenceType = 'shortage'
        shortageCount++
        differencesCount++
      }

      if (!isNaN(actualStock)) {
        checkedProducts++
      }

      return {
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        category: item.category?.name || null,
        systemStock,
        actualStock: finalActualStock,
        difference,
        differenceType
      }
    })

    // Použij transakci pro atomické vytvoření inventury a pohybů
    const inventura = await prisma.$transaction(async (tx) => {
      // Vygeneruj číslo inventury
      const inventuraNumber = await getNextDocumentNumber('inventura', tx)

      // Vytvoř inventuru s položkami
      const inv = await tx.inventura.create({
        data: {
          inventuraNumber,
          inventuraDate: new Date(),
          note,
          totalProducts: items.length,
          checkedProducts,
          differencesCount,
          surplusCount,
          shortageCount,
          status: 'completed',
          items: {
            create: processedItems
          }
        },
        include: {
          items: true
        }
      })

      // Vytvoř skladové pohyby pro rozdíly
      for (const item of processedItems) {
        if (item.difference !== 0) {
          await tx.inventoryItem.create({
            data: {
              productId: item.productId,
              quantity: item.difference,
              unit: item.unit,
              purchasePrice: 0,
              date: new Date(),
              note: `Inventura ${inventuraNumber} - ${item.difference > 0 ? 'přebytek' : 'manko'}`
            }
          })
        }
      }

      return inv
    })

    return NextResponse.json(inventura, { status: 201 })
  } catch (error) {
    console.error('Chyba při ukládání inventury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se uložit inventuru' },
      { status: 500 }
    )
  }
}
