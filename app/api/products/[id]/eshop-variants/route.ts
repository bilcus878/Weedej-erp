// GET  /api/products/[id]/eshop-variants  — seznam variant produktu pro eshop
// POST /api/products/[id]/eshop-variants  — vytvoření nové varianty
//
// SKU/EAN behaviour (POST):
//   • sku — if omitted or null the server auto-generates one (PRODUCTCODE-COLOR-SIZE).
//           If supplied it must be unique, ≤ 64 chars, uppercase letters/digits/hyphens.
//   • ean — optional; when supplied must be a valid EAN-8, EAN-13 or GTIN-14 with a
//           correct GS1 check digit, and must not already exist on another variant.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveVariantIdentifiers } from '@/lib/variantIdentification'

export const dynamic = 'force-dynamic'

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { id } = await params

  const variants = await prisma.eshopVariant.findMany({
    where: { productId: id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(variants)
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { id: productId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku (JSON)' }, { status: 400 })
  }

  const { name, price, variantValue, variantUnit, isDefault, isActive, isSumup, sku, ean } = body as {
    name?: string
    price?: unknown
    variantValue?: number | null
    variantUnit?: string | null
    isDefault?: boolean
    isActive?: boolean
    isSumup?: boolean
    sku?: string | null
    ean?: string | null
  }

  // ── Basic field validation ────────────────────────────────────────────────
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Chybí název varianty' }, { status: 400 })
  }
  if (price === undefined || price === null) {
    return NextResponse.json({ error: 'Chybí cena varianty' }, { status: 400 })
  }

  const parsedPrice = parseFloat(String(price))
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return NextResponse.json({ error: 'Cena musí být nezáporné číslo' }, { status: 400 })
  }

  const ALLOWED_UNITS = ['g', 'ml', 'ks']
  if (variantUnit && !ALLOWED_UNITS.includes(variantUnit)) {
    return NextResponse.json(
      { error: 'Neplatná jednotka varianty (povoleno: g, ml, ks)' },
      { status: 400 }
    )
  }

  // ── Resolve parent product for SKU generation ────────────────────────────
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  })

  if (!product) {
    return NextResponse.json({ error: 'Produkt nenalezen' }, { status: 404 })
  }

  // ── SKU + EAN validation / generation (inside transaction) ───────────────
  try {
    const variant = await prisma.$transaction(async (tx) => {
      // Resolve identifiers atomically so uniqueness checks are race-safe
      const identResult = await resolveVariantIdentifiers(
        {
          sku:             sku ?? null,
          ean:             ean ?? null,
          productName:     product.name,
          variantName:     name.trim(),
          variantValue:    variantValue ?? null,
          variantUnit:     variantUnit ?? null,
        },
        tx,
      )

      if (!identResult.ok) {
        // Throw a structured error so the transaction rolls back and we can catch it below
        const err = new Error('VALIDATION_ERROR')
        ;(err as any).validationErrors = identResult.errors
        ;(err as any).status = identResult.status
        throw err
      }

      // If this variant becomes the default, demote all others
      if (isDefault) {
        await tx.eshopVariant.updateMany({
          where: { productId },
          data:  { isDefault: false },
        })
      }
      // Only one SumUp-linked variant per product
      if (isSumup) {
        await tx.eshopVariant.updateMany({
          where: { productId },
          data:  { isSumup: false },
        })
      }

      return tx.eshopVariant.create({
        data: {
          productId,
          name:         name.trim(),
          price:        parsedPrice,
          variantValue: variantValue != null ? parseFloat(String(variantValue)) : null,
          variantUnit:  variantUnit ?? null,
          isDefault:    isDefault ?? false,
          isActive:     isActive  ?? true,
          isSumup:      isSumup   ?? false,
          sku:          identResult.sku,
          ean:          identResult.ean,
        },
      })
    })

    return NextResponse.json(variant, { status: 201 })
  } catch (err: any) {
    if (err?.message === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { error: 'Chyba validace', errors: err.validationErrors },
        { status: err.status ?? 400 }
      )
    }
    console.error('[eshop-variants POST]', err)
    return NextResponse.json({ error: 'Nepodařilo se vytvořit variantu' }, { status: 500 })
  }
}
