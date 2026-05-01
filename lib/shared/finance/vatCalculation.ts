/**
 * CANONICAL VAT CALCULATION — single source of truth for the entire ERP system.
 *
 * Czech VAT rates since 1.1.2024: 21%, 12%, 0%
 * For non-VAT-payers: vatRate = 0 (price = price, no VAT applied).
 *
 * ⚠️ IMPORTANT: vatRate = 0 has TWO meanings:
 *   1. Non-VAT-payer (isVatPayer = false, vatRate = 0)
 *   2. VAT-payer with 0% rate (isVatPayer = true, vatRate = 0)
 * ALWAYS decide based on isVatPayer flag, NOT just vatRate!
 *
 * RULE: ALL financial calculations must import from this file only.
 * DO NOT import from @/lib/vatCalculation directly — that file is a shim.
 *
 * Import path: @/lib/shared/finance/vatCalculation
 */

export const CZECH_VAT_RATES = [21, 12, 0] as const
export type CzechVatRate = typeof CZECH_VAT_RATES[number]
export const DEFAULT_VAT_RATE = 21

// @deprecated — special value -1 is no longer used.
// Use vatRate = 0 + isVatPayer flag check instead.
export const NON_VAT_PAYER_RATE = -1

export const ALL_VAT_OPTIONS = [21, 12, 0] as const

export const VAT_RATE_LABELS: Record<number, string> = {
  21: '21%',
  12: '12%',
  0: '0%',
  [NON_VAT_PAYER_RATE]: 'Neplátce DPH',
}

// ── Round 2 decimal places (haléře) ──────────────────────────────────────────

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Legacy check helpers ──────────────────────────────────────────────────────

// @deprecated — use isVatPayerEntity() with explicit isVatPayer flag instead
export function isNonVatPayer(vatRate: number): boolean {
  return vatRate === NON_VAT_PAYER_RATE || vatRate < 0
}

// @deprecated — cannot be used without isVatPayer context
export function shouldApplyVat(vatRate: number): boolean {
  if (vatRate < 0) return false
  return vatRate > 0
}

// ── Safe VAT-payer check ──────────────────────────────────────────────────────

/**
 * Is this entity a VAT payer?
 * @param isVatPayer  — flag from Settings (or product/transaction)
 * @param vatRate     — rate (0, 12, 21)
 */
export function isVatPayerEntity(isVatPayer: boolean, vatRate: number): boolean {
  return isVatPayer
}

/**
 * Calculate VAT amount with explicit payer context.
 */
export function calculateVatAmountSafe(
  baseAmount:  number,
  isVatPayer:  boolean,
  vatRate:     number,
): number {
  if (!isVatPayer) return 0
  return round2(baseAmount * vatRate / 100)
}

// ── Net → Gross (forward calculation) ────────────────────────────────────────

export function calculateVatFromNet(priceWithoutVat: number, vatRate: number) {
  const net = round2(priceWithoutVat)
  if (isNonVatPayer(vatRate)) {
    return { priceWithoutVat: net, vatAmount: 0, priceWithVat: net, vatRate }
  }
  const vatAmount   = round2(net * vatRate / 100)
  const priceWithVat = round2(net + vatAmount)
  return { priceWithoutVat: net, vatAmount, priceWithVat, vatRate }
}

// ── Gross → Net (reverse calculation) ────────────────────────────────────────

export function calculateVatFromGross(priceWithVat: number, vatRate: number) {
  const gross = round2(priceWithVat)
  if (isNonVatPayer(vatRate)) {
    return { priceWithoutVat: gross, vatAmount: 0, priceWithVat: gross, vatRate }
  }
  const priceWithoutVat = round2(gross / (1 + vatRate / 100))
  const vatAmount       = round2(gross - priceWithoutVat)
  return { priceWithoutVat, vatAmount, priceWithVat: gross, vatRate }
}

// ── Line-item VAT ─────────────────────────────────────────────────────────────

export function calculateLineVat(
  quantity:             number,
  unitPriceWithoutVat:  number,
  vatRate:              number,
) {
  const totalWithoutVat = round2(quantity * unitPriceWithoutVat)
  if (isNonVatPayer(vatRate)) {
    return { totalWithoutVat, vatAmount: 0, totalWithVat: totalWithoutVat, vatRate }
  }
  const vatAmount    = round2(totalWithoutVat * vatRate / 100)
  const totalWithVat = round2(totalWithoutVat + vatAmount)
  return { totalWithoutVat, vatAmount, totalWithVat, vatRate }
}

// ── VAT summary types ─────────────────────────────────────────────────────────

export interface VatLineItem {
  totalWithoutVat: number
  vatAmount:       number
  totalWithVat:    number
  vatRate:         number
}

export interface VatBreakdown {
  base:  number
  vat:   number
  total: number
}

export interface VatSummaryResult {
  byRate:          Record<number, VatBreakdown>
  totalWithoutVat: number
  totalVat:        number
  totalWithVat:    number
}

// ── Document VAT summary (group by rate) ─────────────────────────────────────

export function calculateVatSummary(items: VatLineItem[]): VatSummaryResult {
  const byRate: Record<number, VatBreakdown> = {}

  for (const item of items) {
    if (!byRate[item.vatRate]) {
      byRate[item.vatRate] = { base: 0, vat: 0, total: 0 }
    }
    byRate[item.vatRate].base  += item.totalWithoutVat
    byRate[item.vatRate].vat   += item.vatAmount
    byRate[item.vatRate].total += item.totalWithVat
  }

  for (const rate of Object.keys(byRate)) {
    const r = Number(rate)
    byRate[r].base  = round2(byRate[r].base)
    byRate[r].vat   = round2(byRate[r].vat)
    byRate[r].total = round2(byRate[r].total)
  }

  const totalWithoutVat = round2(Object.values(byRate).reduce((s, r) => s + r.base,  0))
  const totalVat        = round2(Object.values(byRate).reduce((s, r) => s + r.vat,   0))
  const totalWithVat    = round2(Object.values(byRate).reduce((s, r) => s + r.total, 0))

  return { byRate, totalWithoutVat, totalVat, totalWithVat }
}

// ── Discount + VAT (combined) ─────────────────────────────────────────────────

export function applyDiscountAndCalculateVat(
  items:          Array<{ quantity: number; unitPriceWithoutVat: number; vatRate: number }>,
  discountType?:  string | null,
  discountValue?: number | null,
): {
  lineItems:      VatLineItem[]
  discountAmount: number
  summary:        VatSummaryResult
} {
  const subtotalWithoutVat = items.reduce(
    (sum, item) => sum + round2(item.quantity * item.unitPriceWithoutVat),
    0,
  )

  let discountAmount = 0
  if (discountType && discountValue && discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = round2(subtotalWithoutVat * discountValue / 100)
    } else if (discountType === 'fixed') {
      discountAmount = round2(discountValue)
    }
  }

  const discountRatio = subtotalWithoutVat > 0
    ? (subtotalWithoutVat - discountAmount) / subtotalWithoutVat
    : 1

  const lineItems: VatLineItem[] = items.map(item => {
    const lineTotal      = round2(item.quantity * item.unitPriceWithoutVat)
    const discountedTotal = round2(lineTotal * discountRatio)
    const vatAmount       = isNonVatPayer(item.vatRate) ? 0 : round2(discountedTotal * item.vatRate / 100)
    const totalWithVat    = round2(discountedTotal + vatAmount)
    return { totalWithoutVat: discountedTotal, vatAmount, totalWithVat, vatRate: item.vatRate }
  })

  const summary = calculateVatSummary(lineItems)
  return { lineItems, discountAmount: round2(discountAmount), summary }
}
