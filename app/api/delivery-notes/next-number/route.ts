// API Endpoint pro získání dalšího čísla výdejky
// URL: /api/delivery-notes/next-number

import { previewNextDocumentNumber } from '@/lib/documentNumbering'

export const dynamic = 'force-dynamic'

// GET /api/delivery-notes/next-number - Získat další číslo výdejky
export async function GET() {
  try {
    const nextNumber = await previewNextDocumentNumber('delivery-note')

    return NextResponse.json({ nextNumber })
  } catch (error) {
    console.error('Chyba při získávání čísla výdejky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se získat číslo výdejky' },
      { status: 500 }
    )
  }
}
