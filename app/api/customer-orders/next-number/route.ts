// API Endpoint pro získání dalšího čísla objednávky zákazníka
// URL: /api/customer-orders/next-number

import { previewNextDocumentNumber } from '@/lib/documentNumbering'

export const dynamic = 'force-dynamic'

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
