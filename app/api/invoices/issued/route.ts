// API Endpoint pro vystavené faktury (jen ručně vystavené, bez SumUp)
// URL: http://localhost:3000/api/invoices/issued

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/invoices/issued - Získat všechny ručně vystavené faktury (bez SumUp)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      invoiceType: 'issued',  // Jen ručně vystavené
    }

    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
      orderBy: {
        transactionCode: 'desc' // Nejvyšší číslo nahoře
      },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Chyba při načítání vystavených faktur:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst vystavené faktury' },
      { status: 500 }
    )
  }
}
