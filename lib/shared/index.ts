/**
 * lib/shared — enterprise architecture kernel.
 *
 * This is the ONLY place from which cross-module business logic should be imported.
 * Feature modules, API routes, and components must import from here.
 *
 * Canonical paths (prefer these over the shims in lib/):
 *   @/lib/shared/finance/vatCalculation   — VAT calculations
 *   @/lib/shared/finance/money            — monetary formatting + rounding
 *   @/lib/shared/documents/documentSeries — document numbering (ON-COMMIT)
 *   @/lib/shared/inventory/stockMovement  — stock calculations
 *
 * Or import everything from this barrel:
 *   import { calculateVatFromNet, getNextDocumentNumber } from '@/lib/shared'
 */

// ── Finance ───────────────────────────────────────────────────────────────────
export * from './finance/vatCalculation'
export * from './finance/money'

// ── Documents ─────────────────────────────────────────────────────────────────
export * from './documents/documentSeries'

// ── Inventory ─────────────────────────────────────────────────────────────────
export * from './inventory/stockMovement'

// ── API layer ─────────────────────────────────────────────────────────────────
export * from './api/apiError'
export * from './api/responseWrapper'
export * from './api/idempotency'

// ── Middleware ────────────────────────────────────────────────────────────────
export * from './middleware/apiPipeline'
export * from './middleware/rateLimiter'
export * from './middleware/corsGuard'
export * from './middleware/csrfGuard'

// ── Validation ────────────────────────────────────────────────────────────────
export * from './validation/zodSchemas'
export * from './validation/strictSchemas'
