// API Endpoint pro jednoho odběratele
// URL: http://localhost:3000/api/customers/[id]

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/customers/[id] - Aktualizovat odběratele
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const customer = await prisma.customer.update({
      where: {
        id: params.id,
      },
      data: body,
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Chyba při aktualizaci odběratele:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat odběratele' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Smazat odběratele
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.customer.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ message: 'Odběratel smazán' })
  } catch (error) {
    console.error('Chyba při mazání odběratele:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat odběratele' },
      { status: 500 }
    )
  }
}
