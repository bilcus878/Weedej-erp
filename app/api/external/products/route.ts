// GET /api/external/products
// Vrací seznam aktivních produktů s aktuálním stavem skladu
// Určeno pro e-shop — vyžaduje API klíč v hlavičce X-API-Key
//
// Varianty nyní obsahují sku a ean, aby e-shop mohl:
//   • identifikovat variantu přesně při příjmu objednávky
//   • zobrazit EAN v detailu produktu (čárový kód, mobilní aplikace)
//   • synchronizovat produkty s externími systémy (Google Shopping, Heureka…)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApiKey, corsHeaders, handleOptions } from '@/lib/apiKeyAuth'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')

  const auth = await verifyApiKey(request)
  if (!auth.success) {
    return auth.response
  }

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        id:               true,
        name:             true,
        slug:             true,
        description:      true,
        shortDescription: true,
        imageUrls:        true,
        price:            true,
        vatRate:          true,
        unit:             true,
        isFeatured:       true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        eshopVariants: {
          where: { isActive: true },
          select: {
            id:           true,
            name:         true,
            price:        true,
            variantValue: true,
            variantUnit:  true,
            isDefault:    true,
            isActive:     true,
            // ── Product identification ──────────────────────────────────
            sku:          true,   // unique SKU — use as cart line-item identifier
            ean:          true,   // EAN-8/13/14 barcode — null when not set
          },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
        inventoryItems: {
          select: { quantity: true },
        },
      },
    })

    const result = products.map((product) => {
      const stock = product.inventoryItems.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      )

      return {
        id:               product.id,
        name:             product.name,
        slug:             product.slug,
        description:      product.description,
        shortDescription: product.shortDescription,
        imageUrls:        product.imageUrls,
        price:            Number(product.price),
        vatRate:          Number(product.vatRate),
        priceWithVat:     Number(product.price) * (1 + Number(product.vatRate) / 100),
        unit:             product.unit,
        stock:            Math.max(0, Math.round(stock * 1000) / 1000),
        inStock:          stock > 0,
        isFeatured:       product.isFeatured,
        category:         product.category,
        eshopVariants:    product.eshopVariants.map((v) => ({
          id:           v.id,
          name:         v.name,
          price:        Number(v.price),
          variantValue: v.variantValue,
          variantUnit:  v.variantUnit,
          isDefault:    v.isDefault,
          isActive:     v.isActive,
          sku:          v.sku,    // string | null
          ean:          v.ean,    // string | null
        })),
      }
    })

    return NextResponse.json(result, {
      headers: corsHeaders(origin),
    })
  } catch (error) {
    console.error('[ERP External API] Chyba při načítání produktů:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst produkty' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}
