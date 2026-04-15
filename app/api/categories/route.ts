// API endpoint pro kategorie
// GET /api/categories - načíst všechny kategorie
// POST /api/categories - vytvořit novou kategorii

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/categories - Seznam všech kategorií
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            products: true, // Počet produktů v kategorii
          },
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Chyba při načítání kategorií:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst kategorie' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Vytvořit novou kategorii
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, sumupId } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Název kategorie je povinný' },
        { status: 400 }
      )
    }

    // Zkontroluj, jestli kategorie už neexistuje
    const existing = await prisma.category.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Kategorie s tímto názvem už existuje' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        sumupId: sumupId || null,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření kategorie:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit kategorii' },
      { status: 500 }
    )
  }
}
