// API Endpoint pro storno přijaté faktury
// URL: /api/received-invoices/[id]/storno

import { NextResponse } from 'next/server'
import { stornoReceivedInvoice } from '@/lib/storno'

// POST /api/received-invoices/[id]/storno - Stornovat fakturu
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

    await stornoReceivedInvoice(params.id, reason, userId)

    return NextResponse.json({
      message: 'Faktura (a navázaná objednávka) byla úspěšně stornována',
      success: true
    })
  } catch (error: any) {
    console.error('Chyba při stornování faktury:', error)
    return NextResponse.json(
      { error: error.message || 'Nepodařilo se stornovat fakturu' },
      { status: 500 }
    )
  }
}
