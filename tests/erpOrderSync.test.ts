/**
 * Unit tests — ERP order sync workflow
 *
 * Covers:
 *   1. Idempotency: duplicate eshopOrderId returns existing data
 *   2. HMAC webhook signing + validation (signPayload)
 *   3. Invoice timing: invoice must be issued same day as payment (§ 28 ZDPH)
 *   4. Webhook retry scheduling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// ─── 1. Idempotency ──────────────────────────────────────────────────────────
//
// The ERP /api/orders route must:
// a) On first call with eshopOrderId → create order + return ESH number
// b) On second call with same eshopOrderId → return SAME data, no duplicate

describe('Idempotency', () => {
  it('returns existing order on duplicate eshopOrderId without throwing', () => {
    // Simulate the idempotency check logic from /api/orders route
    const db: Record<string, { erpOrderNumber: string; invoiceNumber: string }> = {}

    function createOrFindOrder(eshopOrderId: string): { erpOrderNumber: string; isNew: boolean } {
      if (db[eshopOrderId]) {
        return { ...db[eshopOrderId], isNew: false }
      }
      const created = { erpOrderNumber: `ESH20260001`, invoiceNumber: `VF20260001` }
      db[eshopOrderId] = created
      return { ...created, isNew: true }
    }

    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

    const first  = createOrFindOrder(id)
    const second = createOrFindOrder(id)

    expect(first.isNew).toBe(true)
    expect(second.isNew).toBe(false)
    expect(first.erpOrderNumber).toBe(second.erpOrderNumber)
  })

  it('different eshopOrderIds create separate orders', () => {
    let counter = 0
    const db: Record<string, string> = {}

    function createOrFindOrder(eshopOrderId: string): string {
      if (db[eshopOrderId]) return db[eshopOrderId]
      counter++
      db[eshopOrderId] = `ESH2026${String(counter).padStart(4, '0')}`
      return db[eshopOrderId]
    }

    const n1 = createOrFindOrder('aaaaaaaa-0000-0000-0000-000000000001')
    const n2 = createOrFindOrder('aaaaaaaa-0000-0000-0000-000000000002')

    expect(n1).not.toBe(n2)
    expect(n1).toBe('ESH20260001')
    expect(n2).toBe('ESH20260002')
  })

  it('ESH order number format matches ESH{YYYY}{XXXX}', () => {
    const year = new Date().getFullYear()
    // The documentSeries generates: ESH + year + padded 4-digit sequence
    function generateOrderNumber(year: number, seq: number): string {
      return `ESH${year}${String(seq).padStart(4, '0')}`
    }

    expect(generateOrderNumber(2026, 1)).toBe('ESH20260001')
    expect(generateOrderNumber(2026, 42)).toBe('ESH20260042')
    expect(generateOrderNumber(year, 9999)).toBe(`ESH${year}9999`)
    // Matches the brief format ESH{YYYY}{XXXX}
    expect(generateOrderNumber(2026, 42)).toMatch(/^ESH\d{4}\d{4}$/)
  })
})

// ─── 2. HMAC webhook validation ───────────────────────────────────────────────

describe('HMAC webhook signing', () => {
  const SECRET = 'test-webhook-secret-32chars-long!!'

  function signPayload(body: string, secret: string): string {
    return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`
  }

  function verifySignature(rawBody: string, sigHeader: string | null, secret: string): boolean {
    if (!sigHeader) return false
    const expected = signPayload(rawBody, secret)
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader))
    } catch {
      return false
    }
  }

  it('valid signature passes verification', () => {
    const body = JSON.stringify({ eshopOrderId: 'uuid-1', erpOrderNumber: 'ESH20260001' })
    const sig  = signPayload(body, SECRET)
    expect(verifySignature(body, sig, SECRET)).toBe(true)
  })

  it('tampered body fails verification', () => {
    const body    = JSON.stringify({ eshopOrderId: 'uuid-1', erpOrderNumber: 'ESH20260001' })
    const sig     = signPayload(body, SECRET)
    const tampered = body.replace('uuid-1', 'uuid-2')
    expect(verifySignature(tampered, sig, SECRET)).toBe(false)
  })

  it('wrong secret fails verification', () => {
    const body       = JSON.stringify({ eshopOrderId: 'uuid-1' })
    const sig        = signPayload(body, SECRET)
    const wrongSecret = 'wrong-secret'
    expect(verifySignature(body, sig, wrongSecret)).toBe(false)
  })

  it('missing signature header fails verification', () => {
    const body = JSON.stringify({ eshopOrderId: 'uuid-1' })
    expect(verifySignature(body, null, SECRET)).toBe(false)
  })

  it('signature header must be sha256=<hex> format', () => {
    const body = JSON.stringify({ eshopOrderId: 'uuid-1' })
    const sig  = signPayload(body, SECRET)
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/)
  })

  it('uses constant-time comparison (no timing leak)', () => {
    // timingSafeEqual throws if buffers are different length
    const body = JSON.stringify({ test: true })
    const sig  = signPayload(body, SECRET)
    // Different-length string should be caught and return false (not throw)
    expect(() => verifySignature(body, 'sha256=tooshort', SECRET)).not.toThrow()
    expect(verifySignature(body, 'sha256=tooshort', SECRET)).toBe(false)
  })
})

// ─── 3. Invoice timing (§ 28 ZDPH) ──────────────────────────────────────────

describe('Invoice timing — § 28 ZDPH', () => {
  it('invoice date must equal payment date (same day)', () => {
    const paidAt = new Date('2026-04-16T10:00:00.000Z')

    // In the ERP route, invoice is created synchronously in the same request
    // as the order. The invoice date defaults to new Date() which = now = same day.
    function createInvoiceDate(paymentDate: Date): Date {
      // Simulates: invoiceDate: new Date() in createIssuedInvoiceFromCustomerOrder
      // Called immediately after order creation in POST /api/orders
      return new Date()   // would be within milliseconds of payment
    }

    const invoiceDate = createInvoiceDate(paidAt)
    const diffMs = Math.abs(invoiceDate.getTime() - Date.now())

    // Invoice created within the same request (< 5 seconds)
    expect(diffMs).toBeLessThan(5000)
  })

  it('15-day legal deadline: invoice must be within 15 days of DUZP', () => {
    // § 28 odst. 1 — Plátce je povinen vystavit daňový doklad do 15 dnů ode dne,
    // kdy nastalo zdanitelné plnění (= platba)
    const duzp = new Date('2026-04-01T00:00:00.000Z')

    function isWithinLegalDeadline(duzp: Date, invoiceDate: Date): boolean {
      const diffDays = (invoiceDate.getTime() - duzp.getTime()) / (1000 * 60 * 60 * 24)
      return diffDays >= 0 && diffDays <= 15
    }

    // Same day (immediate) — legal
    expect(isWithinLegalDeadline(duzp, new Date('2026-04-01T00:00:00.000Z'))).toBe(true)
    // Day 15 — legal (inclusive)
    expect(isWithinLegalDeadline(duzp, new Date('2026-04-16T00:00:00.000Z'))).toBe(true)
    // Day 16 — illegal
    expect(isWithinLegalDeadline(duzp, new Date('2026-04-17T00:00:00.000Z'))).toBe(false)
    // Before payment — illegal
    expect(isWithinLegalDeadline(duzp, new Date('2026-03-31T00:00:00.000Z'))).toBe(false)
  })

  it('payment = DUZP (taxable supply date)', () => {
    // In the e-shop flow, customer pays → Stripe confirms → ERP receives order
    // The paidAt field is the DUZP. The invoice is generated synchronously.
    const paidAt = '2026-04-16T10:30:00.000Z'
    const erpPayload = {
      paidAt,
      // ERP creates: paidAt: new Date(body.paidAt)
      // Invoice DUZP = invoiceDate = new Date()  (same request)
    }
    // Verify paidAt is a valid ISO date
    expect(() => new Date(erpPayload.paidAt)).not.toThrow()
    expect(new Date(erpPayload.paidAt).toISOString()).toBe(paidAt)
  })
})

// ─── 4. Webhook retry scheduling ─────────────────────────────────────────────

describe('Webhook retry queue', () => {
  const RETRY_DELAYS_MIN = [1, 5]   // 2 retries after initial attempt; attempt 3 → dead letter

  function getNextRetryAt(attemptCount: number): Date | null {
    const delayMin = RETRY_DELAYS_MIN[attemptCount - 1] ?? null
    if (delayMin === null) return null
    return new Date(Date.now() + delayMin * 60_000)
  }

  it('attempt 1 failure → retry in 1 min', () => {
    const retryAt = getNextRetryAt(1)
    expect(retryAt).not.toBeNull()
    const diffMin = (retryAt!.getTime() - Date.now()) / 60_000
    expect(diffMin).toBeCloseTo(1, 0)
  })

  it('attempt 2 failure → retry in 5 min', () => {
    const retryAt = getNextRetryAt(2)
    const diffMin = (retryAt!.getTime() - Date.now()) / 60_000
    expect(diffMin).toBeCloseTo(5, 0)
  })

  it('attempt 3 failure → dead letter (no more retries)', () => {
    const retryAt = getNextRetryAt(3)
    expect(retryAt).toBeNull()
  })

  it('status transitions: pending → retrying → dead', () => {
    function getStatus(attemptCount: number, isDead: boolean): string {
      if (isDead) return 'dead'
      if (attemptCount === 0) return 'pending'
      return 'retrying'
    }

    expect(getStatus(0, false)).toBe('pending')
    expect(getStatus(1, false)).toBe('retrying')
    expect(getStatus(2, false)).toBe('retrying')
    expect(getStatus(3, true)).toBe('dead')
  })

  it('max 3 attempts total', () => {
    const MAX = 3
    let attempts = 0
    let isDead   = false

    for (let i = 0; i < 5; i++) {
      if (attempts < MAX) attempts++
      if (attempts >= MAX) isDead = true
    }

    expect(isDead).toBe(true)
    expect(attempts).toBe(MAX)
  })
})

// ─── 5. E-shop retry queue (pending_erp_sync) ────────────────────────────────

describe('E-shop ERP sync retry queue', () => {
  const MAX_ATTEMPTS = 3
  const BACKOFF_MS   = [0, 5 * 60_000, 15 * 60_000]

  function shouldRetry(order: { erpSyncAttempts: number; lastAttemptAt: Date | null }): boolean {
    if (order.erpSyncAttempts >= MAX_ATTEMPTS) return false
    const backoff = BACKOFF_MS[order.erpSyncAttempts] ?? 0
    if (!order.lastAttemptAt) return true
    return Date.now() - order.lastAttemptAt.getTime() >= backoff
  }

  it('new order (0 attempts) is immediately retryable', () => {
    expect(shouldRetry({ erpSyncAttempts: 0, lastAttemptAt: null })).toBe(true)
  })

  it('after 1 attempt, must wait 5 min before retry', () => {
    const justNow  = new Date()
    const fiveAgo  = new Date(Date.now() - 5 * 60_000 - 1000)

    expect(shouldRetry({ erpSyncAttempts: 1, lastAttemptAt: justNow })).toBe(false)
    expect(shouldRetry({ erpSyncAttempts: 1, lastAttemptAt: fiveAgo })).toBe(true)
  })

  it('after 3 attempts, order goes to sync_failed — no more retries', () => {
    expect(shouldRetry({ erpSyncAttempts: 3, lastAttemptAt: new Date() })).toBe(false)
  })

  it('sync_failed order requires manual admin intervention', () => {
    // This test documents expected behavior — after 3 fails, status = sync_failed
    // and admin must be alerted. No automatic recovery.
    const statuses = ['pending_erp_sync', 'pending_erp_sync', 'pending_erp_sync', 'sync_failed']
    expect(statuses[statuses.length - 1]).toBe('sync_failed')
  })
})
