// PATCH  /api/products/[id]/eshop-variants/[variantId]  — úprava varianty
// DELETE /api/products/[id]/eshop-variants/[variantId]  — smazání varianty
//
// SKU/EAN behaviour (PATCH):
//   • sku — if the key is present in the body it replaces the stored value.
//           Pass null explicitly to keep the existing SKU (field is ignored).
//           The updated value is validated for format and uniqueness (self excluded).
//   • ean — if the key is present it replaces the stored value.
//           Pass null to clear the EAN from the variant.
//           When non-null it is validated for format and uniqueness (self excluded).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveVariantIdentifiers } from '@/lib/variantIdentification'

export const dynamic = 'force-dynamic'

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { id: productId, variantId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku (JSON)' }, { status: 400 })
  }

  const {
    name,
    price,
    variantValue,
    variantUnit,
    isDefault,
    isActive,
    isSumup,
    sku,
    ean,
  } = body as {
    name?: string
    price?: unknown
    variantValue?: number | null
    variantUnit?: string | null
    isDefault?: boolean
    isActive?: boolean
    isSumup?: boolean
    /** undefined = leave unchanged; string = update to this value; null = leave unchanged */
    sku?: string | null | undefined
    /** undefined = leave unchanged; string = update to this value; null = clear EAN */
    ean?: string | null | undefined
  }

  const ALLOWED_UNITS = ['g', 'ml', 'ks']
  if (variantUnit !== undefined && variantUnit !== null && !ALLOWED_UNITS.includes(variantUnit)) {
    return NextResponse.json(
      { error: 'Neplatná jednotka varianty (povoleno: g, ml, ks)' },
      { status: 400 }
    )
  }

  // ── Load current variant to resolve defaults for generation context ───────
  const existing = await prisma.eshopVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { id: true, name: true } } },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Varianta nenalezena' }, { status: 404 })
  }

  // Guard: variant must belong to the product in the URL
  if (existing.productId !== productId) {
    return NextResponse.json({ error: 'Varianta nepatří k tomuto produktu' }, { status: 400 })
  }

  // Determine whether the caller intends to mutate SKU or EAN.
  // Convention: key absent in body → no change; key present (even null) → update.
  const skuInBody = Object.prototype.hasOwnProperty.call(body, 'sku')
  const eanInBody = Object.prototype.hasOwnProperty.call(body, 'ean')

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // ── Build the update payload ────────────────────────────────────────
      const data: Record<string, unknown> = {}

      if (name       !== undefined) data.name         = typeof name === 'string' ? name.trim() : name
      if (price      !== undefined) {
        const p = parseFloat(String(price))
        if (isNaN(p) || p < 0) {
          const err = new Error('VALIDATION_ERROR')
          ;(err as any).validationErrors = { price: 'Cena musí být nezáporné číslo' }
          ;(err as any).status = 400
          throw err
        }
        data.price = p
      }
      if (variantValue !== undefined) data.variantValue = variantValue != null ? parseFloat(String(variantValue)) : null
      if (variantUnit  !== undefined) data.variantUnit  = variantUnit ?? null
      if (isDefault    !== undefined) data.isDefault    = isDefault
      if (isActive     !== undefined) data.isActive     = isActive
      if (isSumup      !== undefined) data.isSumup      = isSumup

      // ── SKU / EAN validation (only when caller touches these fields) ────
      const needsIdentifierValidation = skuInBody || eanInBody

      if (needsIdentifierValidation) {
        // Resolve the "effective" variant name and product name for auto-gen context
        const effectiveName        = (data.name as string | undefined)    ?? existing.name
        const effectiveVariantValue = (data.variantValue as number | undefined) ?? existing.variantValue
        const effectiveVariantUnit  = (data.variantUnit as string | undefined)  ?? existing.variantUnit

        const identResult = await resolveVariantIdentifiers(
          {
            // When sku key is present and non-null → validate the supplied value
            // When sku key is absent → pass existing sku so it validates itself (no-op effectively,
            //   but we still exclude self so the uniqueness check passes)
            sku:             skuInBody && sku != null  ? sku  : existing.sku,
            // When ean key is present with null → clear the EAN (pass null, skip validation)
            ean:             eanInBody                  ? (ean ?? null) : existing.ean,
            productName:     existing.product.name,
            variantName:     effectiveName,
            variantValue:    typeof effectiveVariantValue === 'number' ? effectiveVariantValue : null,
            variantUnit:     typeof effectiveVariantUnit  === 'string' ? effectiveVariantUnit  : null,
            excludeVariantId: variantId,
          },
          tx,
        )

        if (!identResult.ok) {
          const err = new Error('VALIDATION_ERROR')
          ;(err as any).validationErrors = identResult.errors
          ;(err as any).status = identResult.status
          throw err
        }

        // Only write SKU/EAN into the payload when the caller explicitly sent them
        if (skuInBody) data.sku = identResult.sku
        if (eanInBody) data.ean = identResult.ean   // may be null (caller cleared it)
      }

      // ── Single-default constraint: demote siblings when this becomes default ──
      if (isDefault) {
        await tx.eshopVariant.updateMany({
          where: { productId, id: { not: variantId } },
          data:  { isDefault: false },
        })
      }
      // Single SumUp variant per product
      if (isSumup) {
        await tx.eshopVariant.updateMany({
          where: { productId, id: { not: variantId } },
          data:  { isSumup: false },
        })
      }

      return tx.eshopVariant.update({
        where: { id: variantId },
        data,
      })
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    if (err?.message === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { error: 'Chyba validace', errors: err.validationErrors },
        { status: err.status ?? 400 }
      )
    }
    console.error('[eshop-variants PATCH]', err)
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat variantu' }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { variantId } = await params

  await prisma.eshopVariant.delete({ where: { id: variantId } })

  return NextResponse.json({ success: true })
}
