/**
 * EAN / GTIN barcode validation — pure functions, no I/O.
 *
 * Supported formats:
 *   EAN-8   (GTIN-8)  — 8 digits, used for small retail packages
 *   EAN-13  (GTIN-13) — 13 digits, standard retail barcode
 *   GTIN-14 (EAN-14)  — 14 digits, logistics/trade units
 *
 * Check-digit algorithm (GS1 standard, identical for all three formats):
 *   1. Starting from the rightmost DATA digit (index n-2), assign alternating
 *      multipliers: 3 for odd positions from the right, 1 for even positions.
 *   2. Sum all products.
 *   3. Check digit = (10 - (sum % 10)) % 10.
 *
 * References: https://www.gs1.org/services/how-calculate-check-digit-manually
 */

export type EanFormat = 'EAN8' | 'EAN13' | 'GTIN14'

export interface EanValidationResult {
  valid: boolean
  format: EanFormat | null
  /** Human-readable reason when valid === false */
  error?: string
}

const VALID_LENGTHS: Record<number, EanFormat> = {
  8:  'EAN8',
  13: 'EAN13',
  14: 'GTIN14',
}

function computeCheckDigit(dataDigits: number[]): number {
  const sum = dataDigits.reduceRight((acc, digit, idx) => {
    const posFromRight = dataDigits.length - idx
    const multiplier = posFromRight % 2 === 1 ? 3 : 1
    return acc + digit * multiplier
  }, 0)
  return (10 - (sum % 10)) % 10
}

export function validateEan(raw: string): EanValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, format: null, error: 'EAN nesmí být prázdný' }
  }
  const cleaned = raw.replace(/[\s\-]/g, '')
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, format: null, error: `EAN musí obsahovat pouze číslice (obdrženo: "${raw}")` }
  }
  const format = VALID_LENGTHS[cleaned.length]
  if (!format) {
    return { valid: false, format: null, error: `Neplatná délka EAN: ${cleaned.length} číslic (povoleno: 8, 13, 14)` }
  }
  const digits = cleaned.split('').map(Number)
  const dataDigits = digits.slice(0, -1)
  const suppliedCheck = digits[digits.length - 1]
  const expectedCheck = computeCheckDigit(dataDigits)
  if (suppliedCheck !== expectedCheck) {
    return { valid: false, format, error: `Neplatná kontrolní číslice EAN ${format}: očekáváno ${expectedCheck}, obdrženo ${suppliedCheck}` }
  }
  return { valid: true, format }
}

export function isValidEan(raw: string): boolean {
  return validateEan(raw).valid
}

export function normaliseEan(raw: string | null | undefined): string | null {
  if (!raw) return null
  return raw.replace(/[\s\-]/g, '') || null
}
