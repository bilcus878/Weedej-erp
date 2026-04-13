// API Endpoint pro jednu výdejku
// URL: /api/delivery-notes/[id]

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/delivery-notes/[id] - Získat detail výdejky
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        transaction: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!deliveryNote) {
      return NextResponse.json(
        { error: 'Výdejka nenalezena' },
        { status: 404 }
      )
    }

    return NextResponse.json(deliveryNote)
  } catch (error) {
    console.error('Chyba při načítání výdejky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst výdejku' },
      { status: 500 }
    )
  }
}

// PATCH /api/delivery-notes/[id] - Upravit výdejku (jen draft)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { items, deliveryDate, note } = body

    // Zkontroluj, že výdejka je draft
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: params.id }
    })

    if (!deliveryNote) {
      return NextResponse.json(
        { error: 'Výdejka nenalezena' },
        { status: 404 }
      )
    }

    if (deliveryNote.status !== 'draft') {
      return NextResponse.json(
        { error: 'Lze upravovat pouze výdejky ve stavu "draft"' },
        { status: 400 }
      )
    }

    // Pokud se mění položky, přepsat je
    if (items) {
      // Smaž staré položky
      await prisma.deliveryNoteItem.deleteMany({
        where: { deliveryNoteId: params.id }
      })

      // Vytvoř nové položky
      for (const item of items) {
        await prisma.deliveryNoteItem.create({
          data: {
            deliveryNoteId: params.id,
            productId: item.isManual ? null : item.productId,
            productName: item.isManual ? item.productName : null,
            quantity: Number(item.quantity),
            unit: item.unit
          }
        })
      }
    }

    // Aktualizuj výdejku
    const updated = await prisma.deliveryNote.update({
      where: { id: params.id },
      data: {
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        note: note !== undefined ? note : undefined
      },
      include: {
        customer: true,
        transaction: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Chyba při aktualizaci výdejky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat výdejku' },
      { status: 500 }
    )
  }
}

// DELETE /api/delivery-notes/[id] - Smazat výdejku
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: params.id }
    })

    if (!deliveryNote) {
      return NextResponse.json(
        { error: 'Výdejka nenalezena' },
        { status: 404 }
      )
    }

    // DOČASNĚ: Povolit mazání všech výdejek (pro testování)
    // TODO: V produkci omezit jen na draft
    console.log(`⚠️  Mažu výdejku ${deliveryNote.deliveryNumber} (status: ${deliveryNote.status})`)

    // Smaž výdejku (cascade smaže i položky)
    await prisma.deliveryNote.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Výdejka smazána' })
  } catch (error) {
    console.error('Chyba při mazání výdejky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat výdejku' },
      { status: 500 }
    )
  }
}
