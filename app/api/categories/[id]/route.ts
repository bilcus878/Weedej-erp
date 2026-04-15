// API endpoint pro jednotlivou kategorii
// GET /api/categories/[id] - načíst kategorii
// PATCH /api/categories/[id] - upravit kategorii
// DELETE /api/categories/[id] - smazat kategorii

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/categories/[id] - Načíst kategorii
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Kategorie nenalezena' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Chyba při načítání kategorie:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst kategorii' },
      { status: 500 }
    )
  }
}

// PATCH /api/categories/[id] - Upravit kategorii
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Název kategorie je povinný' },
        { status: 400 }
      )
    }

    // Zkontroluj, jestli kategorie s tímto názvem už neexistuje (kromě této)
    const existing = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        NOT: { id: params.id },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Kategorie s tímto názvem už existuje' },
        { status: 400 }
      )
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Chyba při úpravě kategorie:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se upravit kategorii' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Smazat kategorii
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Smaž kategorii (produkty zůstanou, jen se jim nastaví categoryId na null)
    await prisma.category.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Chyba při mazání kategorie:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat kategorii' },
      { status: 500 }
    )
  }
}
