// API pro detail inventury
// GET - detail jedné inventury s položkami

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/inventura/[id] - detail inventury
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const inventura = await prisma.inventura.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { productName: 'asc' }
        }
      }
    })

    if (!inventura) {
      return NextResponse.json(
        { error: 'Inventura nenalezena' },
        { status: 404 }
      )
    }

    return NextResponse.json(inventura)
  } catch (error) {
    console.error('Chyba při načítání inventury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst inventuru' },
      { status: 500 }
    )
  }
}
