// API Endpoint pro jednu transakci
// URL: http://localhost:3000/api/transactions/[id]

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/transactions/[id] - Aktualizovat transakci (doplnit položky)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { items, totalAmount, customerId, paymentType } = body

    // Pokud jsou poskytnuty nové položky, přepiš je
    if (items) {
      // Smaž staré položky
      await prisma.transactionItem.deleteMany({
        where: { transactionId: params.id },
      })

      // Vytvoř nové
      await prisma.transactionItem.createMany({
        data: items.map((item: any) => ({
          transactionId: params.id,
          productId: item.productId || null,
          productName: item.productName || null,
          quantity: Number(item.quantity),
          unit: item.unit,
          price: item.price ? Number(item.price) : null,
        })),
      })

      // SYNCHRONIZUJ položky do výdejky (pokud existuje)
      const deliveryNote = await prisma.deliveryNote.findUnique({
        where: { transactionId: params.id }
      })

      if (deliveryNote) {
        console.log(`🔄 Synchronizuji položky do výdejky ${deliveryNote.deliveryNumber}`)

        // Smaž staré položky výdejky
        await prisma.deliveryNoteItem.deleteMany({
          where: { deliveryNoteId: deliveryNote.id }
        })

        // Vytvoř nové položky výdejky
        await prisma.deliveryNoteItem.createMany({
          data: items.map((item: any) => ({
            deliveryNoteId: deliveryNote.id,
            productId: item.productId || null,
            productName: item.productName || null,
            quantity: Number(item.quantity),
            unit: item.unit,
          })),
        })

        console.log(`✅ Výdejka ${deliveryNote.deliveryNumber} synchronizována`)
      }
    }

    // Aktualizuj samotnou transakci
    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        customerId: customerId !== undefined ? (customerId || null) : undefined,
        paymentType: paymentType !== undefined ? paymentType : undefined,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Chyba při aktualizaci transakce:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat transakci' },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id] - Smazat transakci
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.transaction.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Transakce smazána' })
  } catch (error) {
    console.error('Chyba při mazání transakce:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat transakci' },
      { status: 500 }
    )
  }
}
