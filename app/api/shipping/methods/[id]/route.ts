import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PUT /api/shipping/methods/[id] — update a method
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await req.json()
    const { name, description, price, freeThreshold, codFee, isActive, sortOrder, estimatedDays, note } = body

    const existing = await prisma.shippingMethod.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Metoda dopravy nebyla nalezena' }, { status: 404 })
    }

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: 'Název metody nesmí být prázdný' }, { status: 400 })
    }
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return NextResponse.json({ error: 'Cena musí být nezáporné číslo' }, { status: 400 })
    }

    const updated = await prisma.shippingMethod.update({
      where: { id },
      data: {
        ...(name          !== undefined && { name:          String(name).trim()           }),
        ...(description   !== undefined && { description:   description?.trim() || null   }),
        ...(price         !== undefined && { price:         Math.round(Number(price))     }),
        ...(freeThreshold !== undefined && { freeThreshold: freeThreshold != null ? Math.round(Number(freeThreshold)) : null }),
        ...(codFee        !== undefined && { codFee:        Math.round(Number(codFee))    }),
        ...(isActive      !== undefined && { isActive:      Boolean(isActive)             }),
        ...(sortOrder     !== undefined && { sortOrder:     Math.round(Number(sortOrder)) }),
        ...(estimatedDays !== undefined && { estimatedDays: String(estimatedDays).trim()  }),
        ...(note          !== undefined && { note:          note?.trim() || null          }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/shipping/methods/[id]:', error)
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat metodu dopravy' }, { status: 500 })
  }
}

// DELETE /api/shipping/methods/[id] — only custom methods can be deleted
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const existing = await prisma.shippingMethod.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Metoda dopravy nebyla nalezena' }, { status: 404 })
    }
    if (existing.provider !== 'custom') {
      return NextResponse.json({ error: 'Vestavěné metody dopravy nelze smazat — lze je pouze deaktivovat' }, { status: 400 })
    }

    await prisma.shippingMethod.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/shipping/methods/[id]:', error)
    return NextResponse.json({ error: 'Nepodařilo se smazat metodu dopravy' }, { status: 500 })
  }
}
