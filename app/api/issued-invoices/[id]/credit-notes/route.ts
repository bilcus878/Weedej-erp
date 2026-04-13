// API Endpoint pro dobropisy konkrétní faktury
// URL: /api/issued-invoices/[id]/credit-notes

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/issued-invoices/[id]/credit-notes
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const creditNotes = await prisma.creditNote.findMany({
      where: { issuedInvoiceId: id },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(creditNotes)
  } catch (error) {
    console.error('Chyba při načítání dobropisů faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst dobropisy' },
      { status: 500 }
    )
  }
}
