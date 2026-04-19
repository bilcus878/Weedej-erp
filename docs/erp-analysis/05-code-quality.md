# Code Quality & Logic — Score: 5/10

## Critical Findings

### 1. God Route File — `transactions/sync/route.ts` (1052 lines)
**File:** `app/api/transactions/sync/route.ts`

Single Next.js route handler contains entire SumUp sync orchestration. The same 4 code paths (new/updated/completed/refunded transaction) each call `createDeliveryNoteFromTransaction + createIssuedInvoiceFromTransaction` inline, duplicated 4 times.

**Fix:** Extract to `lib/sumupSync.ts`:
```typescript
export async function processNewTransaction(tx: SumUpTransaction) { ... }
export async function processCompletedTransaction(tx: SumUpTransaction) { ... }
export async function processRefundedTransaction(tx: SumUpTransaction) { ... }
// Route handler becomes:
const result = await processNewTransaction(body.payload)
return NextResponse.json(result)
```

---

### 2. Divergent Shipping Logic — Two Routes, Two Implementations
**File:** `app/api/delivery-notes/[id]/process/route.ts:183-244`

Legacy `process` route only updates `shippedQuantity` (pack count), ignores `shippedBaseQty`. New `create-from-order` route correctly handles both. Variant items dispatched via the legacy route are never fully marked as shipped.

**Fix:** Remove shipping logic from `delivery-notes/[id]/process/route.ts`. Delegate to the same `isItemFullyShipped()` helper and `shippedBaseQty` update pattern used in `create-from-order`.

---

### 3. TODO Production Bypass in DELETE Handler
**File:** `app/api/delivery-notes/[id]/route.ts:139-144`

```typescript
// DOČASNĚ: Povolit mazání všech výdejek (pro testování)
// TODO: V produkci omezit jen na draft
```
Active delivery notes can be deleted without reversing their negative `InventoryItems`, breaking inventory integrity.

**Fix:** Remove bypass. Only allow delete of `status === 'draft'`. Implement storno/reversal for active notes.

---

### 4. Document Numbering Race Condition in `transactions/sync`
**File:** `app/api/transactions/sync/route.ts:45-83`

Manual read-then-increment on `Settings.lastTransactionNumber` outside atomic transaction. Concurrent webhooks can produce duplicate transaction codes.

**Fix:**
```typescript
// Replace manual counter with atomic document series:
const code = await getNextDocumentNumber('transaction', tx)  // already atomic via DocumentSeries
```

---

## High Findings

### 5. PATCH Without Transaction in Delivery Note Update
**File:** `app/api/delivery-notes/[id]/route.ts:74-110`

Sequential `deleteMany` + per-item `create` loop outside a `prisma.$transaction()`. Partial failure leaves note in inconsistent state.

**Fix:** Wrap entire operation in `prisma.$transaction()`.

### 6. Webhook Dispatch Pattern Copy-Pasted 4×
**File:** `app/api/delivery-notes/create-from-order/route.ts:267-289` (and 3 other files)

Identical fire-and-forget webhook pattern, `erpUrl` construction, dynamic import duplicated.

**Fix:**
```typescript
// lib/webhookDispatch.ts
export async function dispatchOrderShippedWebhook(orderId: string, data: WebhookData) {
  const erpUrl = process.env.ERP_PUBLIC_URL || process.env.NEXTAUTH_URL || ''
  const { enqueueOrderShippedWebhook } = await import('./eshopWebhook')
  return enqueueOrderShippedWebhook(orderId, { ...data, erpUrl })
}
```

### 7. Stock Validation Loop Duplicated 3×
**File:** `app/api/delivery-notes/route.ts:74-93`, `create-from-order/route.ts:62-73`, `[id]/process/route.ts:78-119`

Identical `canDeliverQuantity` loop with dynamic import inside.

**Fix:** Extract to `lib/deliveryValidation.ts`:
```typescript
export async function validateStockForItems(items: DeliveryItem[], allowNegative = false) { ... }
```

### 8. Business Logic Inline in Route Handler
**File:** `app/api/delivery-notes/create-from-order/route.ts:78-129`

42-line `resolveItemPrice()` function defined inside POST handler. Domain logic belongs in `lib/`.

**Fix:** Move to `lib/priceResolution.ts`.

### 9. N+1 in `getAllProductsStock()`
See [Performance report](./03-performance.md#1-n1-queries--getallproductsstock-and-apiinventorysummary).

---

## Medium Findings

- 97 occurrences of `: any` across 37 files — type `Prisma.TransactionClient`, create typed interfaces
- Dynamic imports of stable lib/ utilities inside hot paths — convert to static top-level imports
- Deprecated `vatCalculation.ts` exports (`NON_VAT_PAYER_RATE = -1`, `isNonVatPayer()`) still called in active production calculation paths
- Inconsistent error response shapes: `{ error }` vs `{ error, details }` vs `{ message }` — create `lib/apiResponse.ts`
- Status values ('draft', 'active', 'shipped', 'processing') as raw strings scattered across 15 files — create `lib/constants.ts` with enums
- `DocumentType` has dual kebab-case + snake_case variants — pick one canonical form
- 162 `console.log` calls — replace with structured logger; `transactions/sync/route.ts` logs full SumUp transaction objects including financial data

---

## Low Findings

- `lib/documentNumbering.ts` deprecated wrapper still imported by 3 routes — update callers to import from `lib/documentSeries.ts` directly
- `lib/sumup.ts.backup` committed to repo — delete
- `customer-orders/[id]/route.ts` PATCH returns 500 instead of 404 for missing record (catch Prisma P2025 error code)

