// API Endpoint pro uplatnění slevy dodavatele na přijatou fakturu
// URL: /api/received-invoices/[id]/apply-discount

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/received-invoices/[id]/apply-discount - Uplatnit slevu dodavatele
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { discountType, discountValue } = await request.json()

    if (!discountType || !discountValue) {
      return NextResponse.json(
        { error: 'Typ slevy a hodnota slevy jsou povinné' },
        { status: 400 }
      )
    }

    if (discountType !== 'percentage' && discountType !== 'fixed') {
      return NextResponse.json(
        { error: 'Neplatný typ slevy' },
        { status: 400 }
      )
    }

    // Načti fakturu s objednávkou a položkami
    const invoice = await prisma.receivedInvoice.findUnique({
      where: { id: params.id },
      include: {
        purchaseOrder: {
          include: {
            items: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Faktura nenalezena' },
        { status: 404 }
      )
    }

    if (!invoice.purchaseOrder) {
      return NextResponse.json(
        { error: 'Faktura nemá přiřazenou objednávku' },
        { status: 400 }
      )
    }

    if (invoice.discountAmount) {
      return NextResponse.json(
        { error: 'Sleva již byla uplatněna' },
        { status: 400 }
      )
    }

    // Vypočítej mezisoučet z položek objednávky
    const subtotal = invoice.purchaseOrder.items.reduce((sum, item) => {
      return sum + (Number(item.quantity) * Number(item.expectedPrice))
    }, 0)

    // Vypočítej slevu
    let discountAmount = 0
    if (discountType === 'percentage') {
      discountAmount = (subtotal * discountValue) / 100
    } else {
      discountAmount = discountValue
    }

    // Nová celková částka po slevě
    const newTotalAmount = subtotal - discountAmount

    // Vypočítej nové ceny pro jednotlivé položky (proporcionálně)
    const discountRatio = newTotalAmount / subtotal

    // Použij transakci pro atomickou aktualizaci
    await prisma.$transaction(async (tx) => {
      // 1. Uprav ceny položek v objednávce
      for (const item of invoice.purchaseOrder!.items) {
        const newPrice = Number(item.expectedPrice) * discountRatio
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { expectedPrice: newPrice }
        })
      }

      // 2. Aktualizuj objednávku
      await tx.purchaseOrder.update({
        where: { id: invoice.purchaseOrderId! },
        data: {
          totalAmount: newTotalAmount,
          discountType,
          discountValue,
          discountAmount
        }
      })

      // 3. Aktualizuj fakturu
      await tx.receivedInvoice.update({
        where: { id: params.id },
        data: {
          totalAmount: newTotalAmount,
          discountType,
          discountValue,
          discountAmount
        }
      })
    })

    return NextResponse.json({
      message: 'Sleva byla úspěšně uplatněna',
      discountAmount,
      newTotalAmount
    })
  } catch (error) {
    console.error('Chyba při uplatňování slevy:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se uplatnit slevu' },
      { status: 500 }
    )
  }
}
