// API Endpoint pro storno objednávky
// URL: /api/purchase-orders/[id]/storno

import { stornoPurchaseOrder } from '@/lib/storno'

export const dynamic = 'force-dynamic'

// POST /api/purchase-orders/[id]/storno - Stornovat objednávku
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

    await stornoPurchaseOrder(params.id, reason, userId)

    return NextResponse.json({
      message: 'Objednávka (a navázaná faktura) byla úspěšně stornována',
      success: true
    })
  } catch (error: any) {
    console.error('Chyba při stornování objednávky:', error)
    return NextResponse.json(
      { error: error.message || 'Nepodařilo se stornovat objednávku' },
      { status: 500 }
    )
  }
}
