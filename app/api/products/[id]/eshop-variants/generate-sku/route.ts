// GET /api/products/[id]/eshop-variants/generate-sku
//
// Returns a preview of the SKU that would be auto-generated for the given
// product + variant metadata, WITHOUT persisting anything to the database.
// This allows the frontend to show the auto-generated SKU to the user before
// they submit the "create variant" form, so they can accept or override it.
//
// Query parameters:
//   variantName  — required  variant display name (e.g. "30ml - Červená")
//   variantValue — optional  numeric size value (e.g. 30)
//   variantUnit  — optional  unit string: "g" | "ml" | "ks"
//   excludeId    — optional  variantId to exclude from uniqueness check (for edit flows)
//
// Response:
//   200 { sku: "CANNOIL-RED-30ML" }
//   400 { error: "..." }

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateUniqueSku } from '@/lib/skuGeneration'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { id: productId } = await params
  const { searchParams }  = new URL(req.url)

  const variantName  = searchParams.get('variantName')
  const variantValue = searchParams.get('variantValue')
  const variantUnit  = searchParams.get('variantUnit')
  const excludeId    = searchParams.get('excludeId') ?? undefined

  if (!variantName || variantName.trim().length === 0) {
    return NextResponse.json({ error: 'Parametr variantName je povinný' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({
    where:  { id: productId },
    select: { name: true },
  })

  if (!product) {
    return NextResponse.json({ error: 'Produkt nenalezen' }, { status: 404 })
  }

  const parsedValue = variantValue ? parseFloat(variantValue) : null
  const sku = await generateUniqueSku({
    productName:  product.name,
    variantName:  variantName.trim(),
    variantValue: Number.isFinite(parsedValue) ? parsedValue : null,
    variantUnit:  variantUnit || null,
    excludeId,
  })

  return NextResponse.json({ sku })
}
