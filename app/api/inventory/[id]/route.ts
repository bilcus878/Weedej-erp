// API Endpoint pro jednu skladovou položku
// URL: http://localhost:3000/api/inventory/[id]

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/inventory/[id] - Opravit naskladnění (pokud se člověk spletl)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const inventoryItem = await prisma.inventoryItem.update({
      where: {
        id: params.id,
      },
      data: {
        quantity: body.quantity ? Number(body.quantity) : undefined,
        unit: body.unit,
        supplierId: body.supplierId || null, // Prázdný string na null
        purchasePrice: body.purchasePrice ? Number(body.purchasePrice) : undefined,
        date: body.date ? new Date(body.date) : undefined,
        note: body.note || null, // Prázdný string na null
      },
      include: {
        product: true,
        supplier: true,
      },
    })

    return NextResponse.json(inventoryItem)
  } catch (error) {
    console.error('Chyba při aktualizaci skladu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat skladovou položku' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/[id] - Smazat skladovou položku
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.inventoryItem.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ message: 'Skladová položka smazána' })
  } catch (error) {
    console.error('Chyba při mazání skladu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat skladovou položku' },
      { status: 500 }
    )
  }
}
