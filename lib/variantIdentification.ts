/**
 * Variant identification orchestration — SKU + EAN validation pipeline.
 *
 * This module is the single entry point consumed by API route handlers.
 * It runs all business-rule checks in the correct order and returns a
 * structured result rather than throwing, so routes can produce precise
 * HTTP 400 responses with field-level error messages.
 *
 * Responsibilities:
 *   1. Normalise raw SKU and EAN inputs (trim, uppercase, strip separators).
 *   2. Validate SKU format (character set, length, hyphen rules).
 *   3. Validate EAN format and GS1 check digit (when EAN is supplied).
 *   4. Assert SKU uniqueness against the database.
 *   5. Assert EAN uniqueness against the database (when EAN is supplied).
 *   6. Auto-generate a unique SKU when the caller provides none.
 */

import { prisma } from '@/lib/prisma'
import {
  validateEan,
  normaliseEan,
  type EanFormat,
} from '@/lib/eanValidation'
import {
  validateSkuFormat,
  normaliseSku,
  generateUniqueSku,
  type GenerateSkuParams,
} from '@/lib/skuGeneration'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IdentifierInput {
  /** Raw SKU from the request body — may be null/undefined to trigger auto-generation. */
  sku?: string | null
  /** Raw EAN from the request body — null/undefined means "no EAN". */
  ean?: string | null
  /** Parent product metadata required for SKU auto-generation. */
  productName: string
  variantName: string
  variantValue?: number | null
  variantUnit?: string | null
  /**
   * ID of the variant being updated. Excludes the variant from its own uniqueness
   * check so a PATCH that doesn't change the SKU/EAN doesn't self-conflict.
   */
  excludeVariantId?: string
}

export interface IdentifierValidationSuccess {
  ok: true
  /** Normalised SKU ready to persist. */
  sku: string
  /** Normalised EAN ready to persist, or null. */
  ean: string | null
  eanFormat: EanFormat | null
  /** true when SKU was auto-generated (not supplied by the caller). */
  skuWasGenerated: boolean
}

export interface IdentifierValidationFailure {
  ok: false
  /** HTTP status code the caller should return (always 400 or 409). */
  status: 400 | 409
  /** Field-level errors: key = field name, value = human-readable message. */
  errors: Record<string, string>
}

export type IdentifierValidationResult =
  | IdentifierValidationSuccess
  | IdentifierValidationFailure

// ─── EAN uniqueness check ────────────────────────────────────────────────────

async function isEanTaken(
  ean: string,
  excludeId: string | undefined,
  tx: any,
): Promise<boolean> {
  const client = tx || prisma
  const count = await client.eshopVariant.count({
    where: {
      ean,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
  return count > 0
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate and resolve SKU + EAN for a variant create or update operation.
 *
 * Usage (route handler):
 * ```ts
 * const result = await resolveVariantIdentifiers({ sku, ean, productName, variantName, ... })
 * if (!result.ok) {
 *   return NextResponse.json({ errors: result.errors }, { status: result.status })
 * }
 * // result.sku and result.ean are safe to persist
 * ```
 *
 * @param input - Raw inputs from the request body plus product metadata.
 * @param tx    - Optional Prisma transaction client (pass when called inside $transaction).
 */
export async function resolveVariantIdentifiers(
  input: IdentifierInput,
  tx?: any,
): Promise<IdentifierValidationResult> {
  const errors: Record<string, string> = {}
  const {
    productName,
    variantName,
    variantValue,
    variantUnit,
    excludeVariantId,
  } = input

  // ── 1. SKU resolution ────────────────────────────────────────────────────
  let resolvedSku: string
  let skuWasGenerated = false

  if (!input.sku) {
    // Auto-generate when caller omits SKU
    const params: GenerateSkuParams = {
      productName,
      variantName,
      variantValue,
      variantUnit,
      excludeId: excludeVariantId,
    }
    resolvedSku = await generateUniqueSku(params, tx)
    skuWasGenerated = true
  } else {
    resolvedSku = normaliseSku(input.sku)

    const formatCheck = validateSkuFormat(resolvedSku)
    if (!formatCheck.valid) {
      errors.sku = formatCheck.error!
    } else {
      // Check DB uniqueness only when format is valid
      const client = tx || prisma
      const count = await client.eshopVariant.count({
        where: {
          sku: resolvedSku,
          ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}),
        },
      })
      if (count > 0) {
        errors.sku = `SKU "${resolvedSku}" je již použito jinou variantou`
      }
    }
  }

  // ── 2. EAN resolution (optional) ─────────────────────────────────────────
  let resolvedEan: string | null = null
  let resolvedEanFormat: EanFormat | null = null

  const rawEan = input.ean ? input.ean.trim() : null

  if (rawEan) {
    const normalised = normaliseEan(rawEan)

    if (!normalised) {
      errors.ean = 'EAN nesmí být prázdný'
    } else {
      const eanResult = validateEan(normalised)

      if (!eanResult.valid) {
        errors.ean = eanResult.error!
      } else {
        // Check DB uniqueness only when format is valid
        const taken = await isEanTaken(normalised, excludeVariantId, tx)
        if (taken) {
          errors.ean = `EAN "${normalised}" je již přiřazen jiné variantě`
        } else {
          resolvedEan = normalised
          resolvedEanFormat = eanResult.format
        }
      }
    }
  }

  // ── 3. Return ─────────────────────────────────────────────────────────────
  if (Object.keys(errors).length > 0) {
    // 409 when the only errors are uniqueness conflicts, 400 otherwise
    const onlyConflicts = Object.values(errors).every((msg) =>
      msg.includes('je již') || msg.includes('already'),
    )
    return {
      ok: false,
      status: onlyConflicts ? 409 : 400,
      errors,
    }
  }

  return {
    ok: true,
    sku: resolvedSku,
    ean: resolvedEan,
    eanFormat: resolvedEanFormat,
    skuWasGenerated,
  }
}
