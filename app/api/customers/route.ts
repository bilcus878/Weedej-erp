// API Endpoint pro odběratele
// URL: http://localhost:3000/api/customers

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customers - Získat všechny odběratele
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Chyba při načítání odběratelů:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst odběratele' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Přidat nového odběratele
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, contact, email, phone, ico, dic, bankAccount, address, note } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Jméno odběratele je povinné' },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        contact: contact || null,
        email: email || null,
        phone: phone || null,
        ico: ico || null,
        dic: dic || null,
        bankAccount: bankAccount || null,
        address: address || null,
        note: note || null,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření odběratele:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit odběratele' },
      { status: 500 }
    )
  }
}
