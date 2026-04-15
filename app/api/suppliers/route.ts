// API Endpoint pro dodavatele
// URL: http://localhost:3000/api/suppliers

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/suppliers - Získat všechny dodavatele
export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Chyba při načítání dodavatelů:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst dodavatele' },
      { status: 500 }
    )
  }
}

// POST /api/suppliers - Přidat nového dodavatele
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, contact, contactPerson, email, phone, ico, dic, bankAccount, website, address, note } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Jméno dodavatele je povinné' },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contact: contactPerson || contact || null, // Accept both contactPerson and contact
        email: email || null,
        phone: phone || null,
        ico: ico || null,
        dic: dic || null,
        bankAccount: bankAccount || null,
        website: website || null,
        address: address || null,
        note: note || null,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error('Chyba při vytváření dodavatele:', error)

    // Pokud je to chyba duplicitního jména (unique constraint)
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return NextResponse.json(
        { error: 'Dodavatel se stejným názvem už existuje. Pokud ho chcete aktualizovat, nejdřív ho smažte a pak vytvořte nového.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit dodavatele' },
      { status: 500 }
    )
  }
}
