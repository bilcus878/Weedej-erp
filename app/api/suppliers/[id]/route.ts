import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Jméno dodavatele je povinné' }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name:        body.name.trim(),
        entityType:  body.entityType  || 'company',
        contact:     body.contact     || null,
        email:       body.email       || null,
        phone:       body.phone       || null,
        ico:         body.ico         || null,
        dic:         body.dic         || null,
        bankAccount: body.bankAccount || null,
        website:     body.website     || null,
        address:     body.address     || null,
        note:        body.note        || null,
      },
    })

    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error('Chyba při aktualizaci dodavatele:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Dodavatel nebyl nalezen' }, { status: 404 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Dodavatel se stejným názvem již existuje' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat dodavatele' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: params.id } })
    if (!supplier) {
      return NextResponse.json({ error: 'Dodavatel nebyl nalezen' }, { status: 404 })
    }

    await prisma.supplier.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Dodavatel byl smazán' })
  } catch (error: any) {
    console.error('Chyba při mazání dodavatele:', error)
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Nelze smazat dodavatele, který má připojené záznamy' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Nepodařilo se smazat dodavatele' }, { status: 500 })
  }
}
