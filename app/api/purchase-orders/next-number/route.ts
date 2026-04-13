// API Endpoint pro získání dalšího čísla objednávky
// URL: /api/purchase-orders/next-number

import { NextResponse } from 'next/server'
import { previewNextDocumentNumber } from '@/lib/documentSeries'

// GET /api/purchase-orders/next-number - Získat další číslo objednávky
export async function GET(request: Request) {
  try {
    // Získej datum z query parametru
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    // Pokud je datum zadáno, použij ho, jinak použij dnešní datum
    const documentDate = dateParam ? new Date(dateParam) : new Date()

    const nextNumber = await previewNextDocumentNumber('purchase-order', documentDate)

    return NextResponse.json({ nextNumber })
  } catch (error) {
    console.error('Chyba při získávání čísla objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se získat číslo objednávky' },
      { status: 500 }
    )
  }
}
