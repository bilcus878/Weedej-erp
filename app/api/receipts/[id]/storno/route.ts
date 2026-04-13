// API Endpoint pro storno příjemky
// URL: /api/receipts/[id]/storno

import { NextResponse } from 'next/server'
import { stornoReceipt } from '@/lib/storno'

// POST /api/receipts/[id]/storno - Stornovat příjemku
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

    await stornoReceipt(params.id, reason, userId)

    return NextResponse.json({
      message: 'Příjemka byla úspěšně stornována',
      success: true
    })
  } catch (error: any) {
    console.error('Chyba při stornování příjemky:', error)
    return NextResponse.json(
      { error: error.message || 'Nepodařilo se stornovat příjemku' },
      { status: 500 }
    )
  }
}
