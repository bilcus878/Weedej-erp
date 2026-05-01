/**
 * money.ts — monetary formatting and arithmetic helpers.
 *
 * Display-layer and arithmetic utilities for monetary values.
 * Business VAT calculations belong in vatCalculation.ts.
 * Safe to import in both server and client code (no Prisma dependency).
 *
 * Note: round2() lives in vatCalculation.ts as the single canonical source.
 * This file uses the same implementation internally but does NOT re-export it
 * to avoid barrel-export name collisions.
 *
 * Import path: @/lib/shared/finance/money
 */

// Internal rounding — matches round2() in vatCalculation.ts exactly.
function r2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Rounding ──────────────────────────────────────────────────────────────────

/** Round to N decimal places. */
export function roundN(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

// ── CZK formatter ─────────────────────────────────────────────────────────────

const CZK_FORMATTER = new Intl.NumberFormat('cs-CZ', {
  style:                 'currency',
  currency:              'CZK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const CZK_COMPACT_FORMATTER = new Intl.NumberFormat('cs-CZ', {
  style:                 'currency',
  currency:              'CZK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format a number as Czech CZK: "1 234,56 Kč" */
export function formatCzk(amount: number): string {
  return CZK_FORMATTER.format(amount)
}

/** Format CZK without decimals: "1 234 Kč" */
export function formatCzkCompact(amount: number): string {
  return CZK_COMPACT_FORMATTER.format(amount)
}

/** Alias — backwards compat with lib/utils.ts formatPrice */
export const formatPrice = formatCzk

// ── Generic currency formatter ────────────────────────────────────────────────

export function formatCurrency(amount: number, currencyCode = 'CZK', locale = 'cs-CZ'): string {
  return new Intl.NumberFormat(locale, {
    style:                 'currency',
    currency:              currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ── Arithmetic helpers ────────────────────────────────────────────────────────

/** Safely parse a monetary value — returns 0 for null/undefined/NaN. */
export function safeMoney(value: unknown): number {
  const n = Number(value)
  return isNaN(n) ? 0 : r2(n)
}

/** Add two monetary amounts with correct rounding. */
export function addMoney(a: number, b: number): number {
  return r2(a + b)
}

/** Subtract two monetary amounts with correct rounding. */
export function subtractMoney(a: number, b: number): number {
  return r2(a - b)
}

/** Multiply a monetary amount by a factor (e.g. quantity × unit price). */
export function multiplyMoney(amount: number, factor: number): number {
  return r2(amount * factor)
}

// ── Percentage helpers ────────────────────────────────────────────────────────

/** Apply a percentage to an amount: amount × (percent / 100). */
export function applyPercent(amount: number, percent: number): number {
  return r2(amount * percent / 100)
}

/** Calculate what percentage `part` is of `whole`. Returns 0 if whole = 0. */
export function percentOf(part: number, whole: number): number {
  if (whole === 0) return 0
  return r2((part / whole) * 100)
}
