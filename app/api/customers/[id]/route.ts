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
      return NextResponse.json({ error: 'Jméno odběratele je povinné' }, { status: 400 })
    }

    const customer = await prisma.customer.update({
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
        address:     body.address     || null,
        note:        body.note        || null,
      },
    })

    return NextResponse.json(customer)
  } catch (error: any) {
    console.error('Chyba při aktualizaci odběratele:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Odběratel nebyl nalezen' }, { status: 404 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Odběratel se stejným názvem již existuje' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat odběratele' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: params.id } })
    if (!customer) {
      return NextResponse.json({ error: 'Odběratel nebyl nalezen' }, { status: 404 })
    }

    await prisma.customer.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Odběratel byl smazán' })
  } catch (error: any) {
    console.error('Chyba při mazání odběratele:', error)
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Nelze smazat odběratele, který má připojené záznamy' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Nepodařilo se smazat odběratele' }, { status: 500 })
  }
}
