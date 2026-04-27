import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Chyba při načítání dodavatelů:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst dodavatele' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, entityType, contact, email, phone, ico, dic, bankAccount, website, address, note } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Jméno dodavatele je povinné' }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        name:        name.trim(),
        entityType:  entityType  || 'company',
        contact:     contact     || null,
        email:       email       || null,
        phone:       phone       || null,
        ico:         ico         || null,
        dic:         dic         || null,
        bankAccount: bankAccount || null,
        website:     website     || null,
        address:     address     || null,
        note:        note        || null,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error('Chyba při vytváření dodavatele:', error)
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return NextResponse.json({ error: 'Dodavatel se stejným názvem již existuje' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Nepodařilo se vytvořit dodavatele' }, { status: 500 })
  }
}
