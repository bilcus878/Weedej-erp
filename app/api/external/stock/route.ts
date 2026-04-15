// GET /api/external/stock
// Vrací aktuální stav skladu pro konkrétní produkty (nebo všechny)
// Query params: ?ids=id1,id2,id3  (volitelné — bez filtru vrátí vše eshopActive)
// Určeno pro e-shop — vyžaduje API klíč v hlavičce X-API-Key

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApiKey, corsHeaders, handleOptions } from '@/lib/apiKeyAuth'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')

  // Ověření API klíče
  const auth = await verifyApiKey(request)
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const ids = idsParam ? idsParam.split(',').filter(Boolean) : null

    const products = await prisma.product.findMany({
      where: {
        eshopActive: true,
        ...(ids ? { id: { in: ids } } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        vatRate: true,
        unit: true,
        inventoryItems: {
          select: { quantity: true },
        },
      },
    })

    const result = products.map((product) => {
      const stock = product.inventoryItems.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      )
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        vatRate: Number(product.vatRate),
        priceWithVat: Number(product.price) * (1 + Number(product.vatRate) / 100),
        unit: product.unit,
        stock: Math.max(0, Math.round(stock * 1000) / 1000),
        inStock: stock > 0,
      }
    })

    return NextResponse.json(result, {
      headers: corsHeaders(origin),
    })
  } catch (error) {
    console.error('[ERP External API] Chyba při načítání skladu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst stav skladu' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}
