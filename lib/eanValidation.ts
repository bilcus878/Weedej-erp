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

/**
 * Compute the GS1 check digit for an array of data digits (without the check digit).
 * The returned value is the expected check digit (0–9).
 */
function computeCheckDigit(dataDigits: number[]): number {
  // Assign multipliers from right to left: 3, 1, 3, 1 …
  const sum = dataDigits.reduceRight((acc, digit, idx) => {
    const posFromRight = dataDigits.length - idx // 1-based position from the right
    const multiplier = posFromRight % 2 === 1 ? 3 : 1
    return acc + digit * multiplier
  }, 0)

  return (10 - (sum % 10)) % 10
}

/**
 * Validate an EAN/GTIN barcode string.
 *
 * @param raw - The raw input string (may contain whitespace/dashes; stripped internally).
 * @returns EanValidationResult with `valid`, `format`, and optional `error`.
 *
 * @example
 *   validateEan('5901234123457') // { valid: true, format: 'EAN13' }
 *   validateEan('96385074')      // { valid: true, format: 'EAN8' }
 *   validateEan('123')           // { valid: false, format: null, error: '...' }
 */
export function validateEan(raw: string): EanValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, format: null, error: 'EAN nesmí být prázdný' }
  }

  // Strip whitespace and common separator characters that some systems include
  const cleaned = raw.replace(/[\s\-]/g, '')

  if (!/^\d+$/.test(cleaned)) {
    return {
      valid: false,
      format: null,
      error: `EAN musí obsahovat pouze číslice (obdrženo: "${raw}")`,
    }
  }

  const format = VALID_LENGTHS[cleaned.length]
  if (!format) {
    return {
      valid: false,
      format: null,
      error: `Neplatná délka EAN: ${cleaned.length} číslic (povoleno: 8, 13, 14)`,
    }
  }

  const digits = cleaned.split('').map(Number)
  const dataDigits = digits.slice(0, -1)
  const suppliedCheck = digits[digits.length - 1]
  const expectedCheck = computeCheckDigit(dataDigits)

  if (suppliedCheck !== expectedCheck) {
    return {
      valid: false,
      format,
      error: `Neplatná kontrolní číslice EAN ${format}: očekáváno ${expectedCheck}, obdrženo ${suppliedCheck}`,
    }
  }

  return { valid: true, format }
}

/**
 * Returns true if the string is a syntactically valid EAN (length + check digit).
 * Convenience wrapper for simple boolean checks.
 */
export function isValidEan(raw: string): boolean {
  return validateEan(raw).valid
}

/**
 * Strip and normalise an EAN string for storage:
 *   - Remove all whitespace and dashes
 *   - Return null when the input is falsy
 *
 * Does NOT validate — call validateEan() first.
 */
export function normaliseEan(raw: string | null | undefined): string | null {
  if (!raw) return null
  return raw.replace(/[\s\-]/g, '') || null
}
