// API Endpoint pro jednu přijatou fakturu
// URL: http://localhost:3000/api/invoices/received/[id]

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/invoices/received/[id] - Získat jednu přijatou fakturu
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        inventoryItems: true,
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Faktura nenalezena' },
        { status: 404 }
      )
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Chyba při načítání faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst fakturu' },
      { status: 500 }
    )
  }
}

// PATCH /api/invoices/received/[id] - Upravit přijatou fakturu
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { items, totalAmount, supplierId, note, attachmentUrl } = body

    // Pokud se mění položky, přenaskladni
    if (items) {
      // Smaž staré položky faktury
      await prisma.transactionItem.deleteMany({
        where: { transactionId: params.id },
      })

      // Smaž staré naskladnění spojené s touto fakturou
      await prisma.inventoryItem.deleteMany({
        where: { transactionId: params.id },
      })

      // Vytvoř nové položky
      for (const item of items) {
        await prisma.transactionItem.create({
          data: {
            transactionId: params.id,
            productId: item.isManual ? null : item.productId,
            productName: item.isManual ? item.productName : null,
            quantity: Number(item.quantity),
            unit: item.unit,
            price: item.purchasePrice ? Number(item.purchasePrice) : null,
          },
        })
      }

      // Načti datum z transakce
      const transaction = await prisma.transaction.findUnique({
        where: { id: params.id },
        select: { transactionDate: true },
      })

      // Naskladni nové položky (jen ty z katalogu)
      for (const item of items) {
        if (!item.isManual && item.productId) {
          await prisma.inventoryItem.create({
            data: {
              productId: item.productId,
              quantity: Number(item.quantity),
              unit: item.unit,
              purchasePrice: Number(item.purchasePrice),
              supplierId: supplierId,
              transactionId: params.id,
              date: transaction?.transactionDate || new Date(), // Použij datum z faktury!
            },
          })
        }
      }
    }

    // Aktualizuj fakturu
    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        supplierId: supplierId !== undefined ? supplierId : undefined,
        note: note !== undefined ? note : undefined,
        attachmentUrl: attachmentUrl !== undefined ? attachmentUrl : undefined,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        inventoryItems: true,
      },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Chyba při aktualizaci faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat fakturu' },
      { status: 500 }
    )
  }
}

// DELETE /api/invoices/received/[id] - Smazat přijatou fakturu
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Smaž naskladnění spojené s fakturou
    await prisma.inventoryItem.deleteMany({
      where: { transactionId: params.id },
    })

    // Smaž fakturu
    await prisma.transaction.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Faktura smazána' })
  } catch (error) {
    console.error('Chyba při mazání faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat fakturu' },
      { status: 500 }
    )
  }
}
