// API Endpoint pro získání dalšího čísla objednávky zákazníka
// URL: /api/customer-orders/next-number

import { NextResponse } from 'next/server'
import { previewNextDocumentNumber } from '@/lib/documentNumbering'

export async function GET() {
  try {
    const nextNumber = await previewNextDocumentNumber('customer-order')
    return NextResponse.json({ nextNumber })
  } catch (error) {
    console.error('Chyba při generování čísla objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vygenerovat číslo objednávky' },
      { status: 500 }
    )
  }
}
