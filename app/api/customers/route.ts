import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(customers)
  } catch (error) {
    console.error('Chyba při načítání odběratelů:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst odběratele' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, entityType, contact, email, phone, ico, dic, bankAccount, address, note } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Jméno odběratele je povinné' }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        name:        name.trim(),
        entityType:  entityType  || 'company',
        contact:     contact     || null,
        email:       email       || null,
        phone:       phone       || null,
        ico:         ico         || null,
        dic:         dic         || null,
        bankAccount: bankAccount || null,
        address:     address     || null,
        note:        note        || null,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    console.error('Chyba při vytváření odběratele:', error)
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return NextResponse.json({ error: 'Odběratel se stejným názvem již existuje' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Nepodařilo se vytvořit odběratele' }, { status: 500 })
  }
}
