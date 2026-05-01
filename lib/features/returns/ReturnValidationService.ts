/**
 * ReturnValidationService — single source of truth for all returns validation.
 *
 * Every public function throws ReturnValidationError on failure.
 * API routes catch that error and return the embedded httpStatus.
 * This eliminates ad-hoc validation scattered across routes and
 * ensures the authoritative state machine is used everywhere.
 */

import { Prisma }          from '@prisma/client'
import { validateTransition, type ReturnStatus } from './returnWorkflow'

// ── System invariant types ────────────────────────────────────────────────────

// Minimal shape needed for assertWorkflowConsistency
interface ReturnRequestSnapshot {
  id:             string
  status:         string
  resolutionType: string | null
  refundAmount:   { toString(): string } | null
  refundStatus:   string
  currency:       string
}

// ── Error type ────────────────────────────────────────────────────────────────

export class ReturnValidationError extends Error {
  constructor(
    message:               string,
    // 4xx = client/business errors; 500 = internal consistency failure (should never happen)
    public readonly httpStatus: 400 | 404 | 409 | 422 | 500 = 422,
  ) {
    super(message)
    this.name = 'ReturnValidationError'
  }
}

// Helper so routes can check the type without importing ReturnValidationError
export function isValidationError(e: unknown): e is ReturnValidationError {
  return e instanceof ReturnValidationError
}

// ── Status transition ─────────────────────────────────────────────────────────

/**
 * Validates that the status transition is legal according to the state machine.
 * Throws ReturnValidationError (422) if not.
 */
export function assertStatusTransition(
  current: string,
  target:  ReturnStatus,
): void {
  try {
    validateTransition(current as ReturnStatus, target)
  } catch (e: unknown) {
    throw new ReturnValidationError(
      e instanceof Error ? e.message : `Neplatný přechod stavu: ${current} → ${target}`,
      422,
    )
  }
}

/**
 * Asserts that the return request is in the exact required status.
 * Use this for action endpoints that have a single valid pre-condition status
 * (e.g., approve requires 'inspecting') rather than using the state machine
 * as a proxy, which would be semantically misleading.
 */
export function assertRequiredStatus(
  current:  string,
  required: ReturnStatus,
  context?: string,
): void {
  if (current !== required) {
    const label = context ?? `Tato akce`
    throw new ReturnValidationError(
      `${label} vyžaduje stav "${required}", ale reklamace je ve stavu "${current}".`,
      422,
    )
  }
}

// ── Currency guard ────────────────────────────────────────────────────────────

const SUPPORTED_CURRENCIES = new Set(['CZK'])

/**
 * Guards against cross-currency operations. Currently only CZK is supported.
 * When multi-currency is added, extend SUPPORTED_CURRENCIES and update
 * processReturnRefund to handle exchange rates.
 */
export function assertCurrency(currency: string): void {
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    throw new ReturnValidationError(
      `Nepodporovaná měna: "${currency}". ` +
      `Systém aktuálně podporuje pouze: ${[...SUPPORTED_CURRENCIES].join(', ')}.`,
      422,
    )
  }
}

// ── Item ownership ────────────────────────────────────────────────────────────

/**
 * Ensures every item ID in the client payload belongs to the specified return request.
 * Prevents a crafted request from modifying items belonging to other returns.
 */
export function assertItemOwnership(
  inputItemIds:  string[],
  existingItems: { id: string }[],
): void {
  const valid = new Set(existingItems.map(i => i.id))
  const rogue  = inputItemIds.filter(id => !valid.has(id))
  if (rogue.length > 0) {
    throw new ReturnValidationError(
      'Požadavek obsahuje položky, které nepatří k této reklamaci.',
      422,
    )
  }
}

// ── Quantity bounds ───────────────────────────────────────────────────────────

/**
 * Ensures that for every approved/partial item, the approved quantity does not
 * exceed the originally returned quantity.
 */
export function assertApprovedQuantities(
  decisions:     Array<{ id: string; itemStatus: string; approvedQuantity?: number | null }>,
  existingItems: Array<{ id: string; productName: string | null; returnedQuantity: Prisma.Decimal }>,
): void {
  for (const d of decisions) {
    if (d.itemStatus === 'rejected') continue
    const item = existingItems.find(i => i.id === d.id)
    if (!item) continue
    const approved = d.approvedQuantity ?? Number(item.returnedQuantity)
    if (approved > Number(item.returnedQuantity)) {
      throw new ReturnValidationError(
        `Schválené množství u položky "${item.productName ?? d.id}" ` +
        `(${approved}) překračuje vrácené množství (${Number(item.returnedQuantity)}).`,
        422,
      )
    }
  }
}

// ── Concurrency / optimistic lock ─────────────────────────────────────────────

/**
 * Call this when a Prisma update that included a status guard (WHERE status = X) fails
 * with P2025, which means the record no longer exists at that status — someone else
 * changed it concurrently. Returns a 409 error for the caller to surface.
 */
export function handleConcurrentModification(): never {
  throw new ReturnValidationError(
    'Stav reklamace byl mezitím změněn jiným uživatelem. Obnovte stránku a opakujte akci.',
    409,
  )
}

// ── Duplicate refund guard ────────────────────────────────────────────────────

/**
 * Call this when a credit-note create fails with P2002 (unique constraint on returnRequestId).
 * The constraint provides the real idempotency guarantee; this wraps the error cleanly.
 */
export function handleDuplicateRefund(): never {
  throw new ReturnValidationError(
    'Refundace pro tuto reklamaci již existuje.',
    409,
  )
}

/**
 * Pre-flight check before entering the transaction.
 * The DB unique constraint is the actual safeguard; this gives a better error message
 * for the common (non-concurrent) case.
 */
export function assertNoExistingRefund(existingCreditNotes: { id: string }[]): void {
  if (existingCreditNotes.length > 0) {
    throw new ReturnValidationError(
      'Refundace pro tuto reklamaci již byla zpracována.',
      422,
    )
  }
}

// ── System self-checks ────────────────────────────────────────────────────────

/**
 * Asserts that a resolved/refunded return has inventory consistency:
 * no item claims to be restocked to an inventory record that has since been deleted.
 *
 * Called as a post-commit sanity check — failures are logged but do NOT roll back
 * (the financial state is already committed by this point). The goal is early
 * detection of data drift, not prevention.
 */
export async function assertInventoryConsistency(
  tx:              Prisma.TransactionClient,
  returnRequestId: string,
): Promise<void> {
  // Find all items that claim to have a restockInventoryItemId
  const items = await tx.returnRequestItem.findMany({
    where: {
      returnRequestId,
      restockInventoryItemId: { not: null },
    },
    select: { id: true, restockInventoryItemId: true },
  })

  if (items.length === 0) return

  const itemIds = items.map(i => i.restockInventoryItemId!).filter(Boolean)
  const existingInventoryItems = await tx.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true },
  })

  const existingIds = new Set(existingInventoryItems.map(i => i.id))
  const orphaned    = itemIds.filter(id => !existingIds.has(id))

  if (orphaned.length > 0) {
    // Log for operational awareness — this is a data integrity issue
    console.error('[ReturnValidationService] Inventory consistency violation:', {
      returnRequestId,
      orphanedInventoryItemIds: orphaned,
    })
    throw new ReturnValidationError(
      `Nesoulad zásob: ${orphaned.length} vrácená položka odkazuje na ` +
      `neexistující záznam v skladu. Kontaktujte administrátora.`,
      500,
    )
  }
}

/**
 * Asserts that the in-memory ReturnRequest has internally consistent state.
 * Catches bugs where, e.g., a resolved return has no refundAmount or wrong currency.
 * Runs synchronously (no DB access) — call it immediately after loading a record.
 */
export function assertWorkflowConsistency(r: ReturnRequestSnapshot): void {
  const resolved = r.status === 'resolved'
  const hasRefund = r.refundAmount !== null && Number(r.refundAmount.toString()) > 0

  // I-F1: resolved returns must have a refund amount
  if (resolved && !hasRefund && r.resolutionType !== 'rejected' && r.resolutionType !== 'repair') {
    throw new ReturnValidationError(
      `Nesoulad stavu: reklamace ${r.id} je ve stavu "resolved" ale nemá refundAmount. ` +
      `Kontaktujte administrátora.`,
      500,
    )
  }

  // I-F2: refundStatus 'completed'/'failed' only allowed in resolved/closed
  const terminalRefundStatuses = new Set(['completed', 'failed'])
  const terminalWorkflowStatuses = new Set(['resolved', 'closed'])
  if (terminalRefundStatuses.has(r.refundStatus) && !terminalWorkflowStatuses.has(r.status)) {
    throw new ReturnValidationError(
      `Nesoulad stavu: reklamace ${r.id} má refundStatus "${r.refundStatus}" ` +
      `ale workflow stav je "${r.status}". Kontaktujte administrátora.`,
      500,
    )
  }

  // I-C1: currency must be non-empty
  if (!r.currency || r.currency.trim() === '') {
    throw new ReturnValidationError(
      `Nesoulad stavu: reklamace ${r.id} nemá nastavenou měnu. Kontaktujte administrátora.`,
      500,
    )
  }
}

// ── Prisma error helpers ──────────────────────────────────────────────────────

/**
 * Rewraps known Prisma error codes into domain-level errors with correct HTTP status.
 * Routes should call this in their catch block before re-throwing.
 */
export function rewrapPrismaError(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2025') handleConcurrentModification()
    if (e.code === 'P2002') handleDuplicateRefund()
  }
  throw e
}
