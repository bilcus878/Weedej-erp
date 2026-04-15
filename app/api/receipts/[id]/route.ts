// API Endpoint pro jednu příjemku
// URL: /api/receipts/[id]

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/receipts/[id] - Získat detail příjemky
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        purchaseOrder: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        items: {
          include: {
            product: true
          }
        },
        inventoryItems: true,
        receivedInvoice: true
      }
    })

    if (!receipt) {
      return NextResponse.json(
        { error: 'Příjemka nenalezena' },
        { status: 404 }
      )
    }

    return NextResponse.json(receipt)
  } catch (error) {
    console.error('Chyba při načítání příjemky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst příjemku' },
      { status: 500 }
    )
  }
}

// PATCH /api/receipts/[id] - Upravit příjemku (jen draft)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { items, receiptDate, note } = body

    // Zkontroluj, že příjemka je draft
    const receipt = await prisma.receipt.findUnique({
      where: { id: params.id }
    })

    if (!receipt) {
      return NextResponse.json(
        { error: 'Příjemka nenalezena' },
        { status: 404 }
      )
    }

    if (receipt.status !== 'draft') {
      return NextResponse.json(
        { error: 'Lze upravovat pouze příjemky ve stavu "draft"' },
        { status: 400 }
      )
    }

    // Pokud se mění položky, přepsat je
    if (items) {
      // Smaž staré položky
      await prisma.receiptItem.deleteMany({
        where: { receiptId: params.id }
      })

      // Vytvoř nové položky
      for (const item of items) {
        await prisma.receiptItem.create({
          data: {
            receiptId: params.id,
            productId: item.isManual ? null : item.productId,
            productName: item.isManual ? item.productName : null,
            quantity: Number(item.quantity),
            unit: item.unit,
            purchasePrice: Number(item.purchasePrice)
          }
        })
      }
    }

    // Aktualizuj příjemku
    const updated = await prisma.receipt.update({
      where: { id: params.id },
      data: {
        receiptDate: receiptDate ? new Date(receiptDate) : undefined,
        note: note !== undefined ? note : undefined
      },
      include: {
        supplier: true,
        purchaseOrder: true,
        items: {
          include: {
            product: true
          }
        },
        inventoryItems: true,
        receivedInvoice: true
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Chyba při aktualizaci příjemky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat příjemku' },
      { status: 500 }
    )
  }
}

// DELETE /api/receipts/[id] - Smazat příjemku (jen draft)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Zkontroluj, že příjemka je draft
    const receipt = await prisma.receipt.findUnique({
      where: { id: params.id },
      include: { inventoryItems: true, receivedInvoice: true }
    })

    if (!receipt) {
      return NextResponse.json(
        { error: 'Příjemka nenalezena' },
        { status: 404 }
      )
    }

    if (receipt.status !== 'draft') {
      return NextResponse.json(
        { error: 'Lze smazat pouze příjemky ve stavu "draft"' },
        { status: 400 }
      )
    }

    if (receipt.inventoryItems.length > 0) {
      return NextResponse.json(
        { error: 'Nelze smazat příjemku, která má naskladnění' },
        { status: 400 }
      )
    }

    if (receipt.receivedInvoice) {
      return NextResponse.json(
        { error: 'Nelze smazat příjemku, která má fakturu' },
        { status: 400 }
      )
    }

    // Smaž příjemku
    await prisma.receipt.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Příjemka smazána' })
  } catch (error) {
    console.error('Chyba při mazání příjemky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat příjemku' },
      { status: 500 }
    )
  }
}
