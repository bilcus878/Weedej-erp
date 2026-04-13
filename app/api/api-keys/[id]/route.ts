// PATCH/DELETE /api/api-keys/[id]
// Deaktivace nebo smazání konkrétního API klíče

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/api-keys/[id] — aktivovat / deaktivovat klíč
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { isActive, name } = body

    const updated = await prisma.apiKey.update({
      where: { id: params.id },
      data: {
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        key: true,
      },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      isActive: updated.isActive,
      lastUsedAt: updated.lastUsedAt,
      createdAt: updated.createdAt,
      keyPreview: `erp_live_...${updated.key.slice(-4)}`,
    })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Klíč nenalezen' }, { status: 404 })
    }
    console.error('Chyba při aktualizaci API klíče:', error)
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat klíč' }, { status: 500 })
  }
}

// DELETE /api/api-keys/[id] — smaže klíč
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.apiKey.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'API klíč byl smazán' })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Klíč nenalezen' }, { status: 404 })
    }
    console.error('Chyba při mazání API klíče:', error)
    return NextResponse.json({ error: 'Nepodařilo se smazat klíč' }, { status: 500 })
  }
}
