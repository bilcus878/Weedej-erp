// API Endpoint pro získání dalšího čísla přijaté faktury
// URL: http://localhost:3000/api/invoices/received/next-number

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
          lastReceivedInvoiceNumber: 0,
        },
      })
    }

    const nextNumber = settings.lastReceivedInvoiceNumber + 1
    const invoiceCode = `PR-${String(nextNumber).padStart(3, '0')}`

    return NextResponse.json({ nextNumber, invoiceCode })
  } catch (error) {
    console.error('Chyba při získávání čísla přijaté faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se získat číslo faktury' },
      { status: 500 }
    )
  }
}
