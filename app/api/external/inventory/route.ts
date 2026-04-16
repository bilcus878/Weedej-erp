/**
 * GET /api/external/inventory
 *
 * Full inventory summary for external consumers (e-shop admin).
 * Returns physical, reserved, available, expected stock + values per product.
 *
 * Requires API key: X-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApiKey, corsHeaders, handleOptions } from '@/lib/apiKeyAuth'
import {
  calculateCurrentStock,
  calculateExpectedStock,
  calculateReservedStock,
} from '@/lib/stockCalculation'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')

  const auth = await verifyApiKey(request)
  if (!auth.success) return auth.response

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        inventoryItems: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })

    const summary = await Promise.all(
      products.map(async (product) => {
        const physicalStock    = await calculateCurrentStock(product.id)
        const reservedStock    = await calculateReservedStock(product.id)
        const availableStock   = physicalStock - reservedStock
        const expectedQuantity = await calculateExpectedStock(product.id)

        const stockInItems        = product.inventoryItems.filter(i => Number(i.quantity) > 0)
        const totalStockedIn      = stockInItems.reduce((s, i) => s + Number(i.quantity), 0)
        const totalValueStockedIn = stockInItems.reduce((s, i) => s + Number(i.quantity) * Number(i.purchasePrice), 0)
        const avgPurchasePrice    = totalStockedIn > 0 ? totalValueStockedIn / totalStockedIn : 0
        const totalPurchaseValue  = physicalStock > 0 ? physicalStock * avgPurchasePrice : 0
        const totalSalesValue     = physicalStock * Number(product.price)

        return {
          productId:          product.id,
          productName:        product.name,
          unit:               product.unit,
          price:              Number(product.price),
          vatRate:            Number((product as any).vatRate ?? 21),
          category:           product.category,
          physicalStock,
          reservedStock,
          availableStock,
          expectedQuantity,
          totalExpectedStock: availableStock + expectedQuantity,
          avgPurchasePrice,
          totalPurchaseValue,
          totalSalesValue,
          stockStatus:        physicalStock === 0 ? 'empty' : physicalStock < 10 ? 'low' : 'ok',
        }
      })
    )

    return NextResponse.json(summary, { headers: corsHeaders(origin) })
  } catch (error) {
    console.error('[ERP /api/external/inventory] Error:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst přehled skladu' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}
