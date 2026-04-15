// API Endpoint pro jednoho dodavatele
// URL: http://localhost:3000/api/suppliers/[id]

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/suppliers/[id] - Aktualizovat dodavatele
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const supplier = await prisma.supplier.update({
      where: {
        id: params.id,
      },
      data: body,
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Chyba při aktualizaci dodavatele:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat dodavatele' },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Smazat dodavatele (TURBO MAZÁNÍ - bez kontroly závislostí)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Zkontroluj jestli dodavatel existuje
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id }
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Dodavatel nebyl nalezen' },
        { status: 404 }
      )
    }

    // TURBO MAZÁNÍ - smaž dodavatele přímo bez kontroly závislostí
    await prisma.supplier.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Dodavatel byl smazán' })
  } catch (error: any) {
    console.error('Chyba při mazání dodavatele:', error)

    // Pokud selhalo kvůli foreign key constraint, vrať specifickou chybu
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Nelze smazat dodavatele, který má připojené záznamy. Kontaktujte administrátora.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Nepodařilo se smazat dodavatele' },
      { status: 500 }
    )
  }
}
