// API Endpoint pro získání dalšího čísla faktury
// URL: http://localhost:3000/api/transactions/next-invoice-number

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Získej settings
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    // Pokud ještě neexistuje, vytvoř výchozí
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'default',
          lastIssuedInvoiceNumber: 0,
          lastIssuedInvoiceYear: 0,
        },
      })
    }

    const currentYear = new Date().getFullYear()

    // Pokud je nový rok, resetuj číslo faktury na 0
    let nextNumber: number
    if (settings.lastIssuedInvoiceYear !== currentYear) {
      nextNumber = 1
    } else {
      nextNumber = settings.lastIssuedInvoiceNumber + 1
    }

    const invoiceCode = `${currentYear}${String(nextNumber).padStart(3, '0')}`

    return NextResponse.json({ nextNumber, invoiceCode })
  } catch (error) {
    console.error('Chyba při získávání čísla faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se získat číslo faktury' },
      { status: 500 }
    )
  }
}
