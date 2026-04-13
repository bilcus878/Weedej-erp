// API Endpoint pro získání dalšího čísla příjemky
// URL: /api/receipts/next-number

import { NextResponse } from 'next/server'
import { previewNextDocumentNumber } from '@/lib/documentNumbering'

// GET /api/receipts/next-number - Získat další číslo příjemky
export async function GET() {
  try {
    const nextNumber = await previewNextDocumentNumber('receipt')

    return NextResponse.json({ nextNumber })
  } catch (error) {
    console.error('Chyba při získávání čísla příjemky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se získat číslo příjemky' },
      { status: 500 }
    )
  }
}
