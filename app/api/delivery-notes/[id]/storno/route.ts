// API Endpoint pro storno výdejky
// URL: /api/delivery-notes/[id]/storno

import { NextResponse } from 'next/server'
import { stornoDeliveryNote } from '@/lib/storno'

export const dynamic = 'force-dynamic'

// POST /api/delivery-notes/[id]/storno - Stornovat výdejku
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { reason, userId } = body

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Důvod storna je povinný' },
        { status: 400 }
      )
    }

    await stornoDeliveryNote(params.id, reason, userId)

    return NextResponse.json({
      message: 'Výdejka byla úspěšně stornována',
      success: true
    })
  } catch (error: any) {
    console.error('Chyba při stornování výdejky:', error)
    return NextResponse.json(
      { error: error.message || 'Nepodařilo se stornovat výdejku' },
      { status: 500 }
    )
  }
}
