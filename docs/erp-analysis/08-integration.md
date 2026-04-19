# ERP ↔ Eshop Integration — Score: 4/10

## 🚨 Critical: ALL Webhooks Currently Failing

### 1. Missing `X-ERP-Timestamp` Header on All ERP-to-Eshop Webhooks
**Files:** `lib/eshopStockWebhook.ts:62`, `lib/eshopWebhook.ts:116-124`

Both eshop webhook receivers (`/api/webhooks/erp/stock-update` and `/api/webhooks/erp/order-shipped`) require `x-erp-timestamp` header for replay-attack prevention. The eshop code even has a comment: **"NOTE: The ERP system MUST be updated to send this header"**.

The ERP never sends it → ALL stock-update pushes and ALL order-shipped notifications currently fail with HTTP 400. Stock updates are silently dropped. Shipped notifications fill up the retry queue toward dead-letter.

**Fix:**
```typescript
// In eshopStockWebhook.ts (the fetch call):
const timestamp = String(Math.floor(Date.now() / 1000))
const body = JSON.stringify(payload)
const signature = computeHmac(body, secret)  // already computed
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-ERP-Signature': signature,
    'X-ERP-Timestamp': timestamp,  // ADD THIS
  },
  body,
})

// Same fix needed in eshopWebhook.ts attemptDelivery function
```

---

### 2. Stock Sync — Fire-and-Forget with No Retry or Persistence
**File:** `lib/eshopStockWebhook.ts:62-72`

`notifyEshopStockUpdate()` calls `fetch().then().catch()` and immediately returns. On failure: `console.warn` only. No DB log, no retry queue, no dead-letter — unlike the order-shipped webhook which has all of these.

**Fix:** Create `EshopStockWebhookLog` model (or reuse `EshopWebhookLog` with type='stock-update') and persist failures for retry.

---

## High Findings

### 3. Tracking Number Always `null` in Shipped Webhook
**File:** `app/api/delivery-notes/create-from-order/route.ts:276-281`

```typescript
trackingNumber: null,  // hardcoded
carrier:        null,  // hardcoded
```
Customer shipping confirmation emails go out without tracking info.

**Fix:** Add `trackingNumber String?` and `carrier String?` to `DeliveryNote` model. Populate during dispatch step or via a follow-up PATCH endpoint.

---

### 4. Delivery Note DELETE Has No Auth + Allows Active Note Deletion
**File:** `app/api/delivery-notes/[id]/route.ts:123-156`

Comment: `"DOCASNE: Povolit mazani vsech vydejek (pro testovani)"`. Deleting active delivery notes leaves orphaned negative `InventoryItems` without reversing the stock deduction.

**Fix:** Remove bypass. Only `draft` notes deletable. Active notes require storno workflow.

---

### 5. Order Sync Idempotency Gap Without `stripeSessionId`
**File:** `app/api/external/orders/route.ts`

ERP deduplicates on `stripeSessionId` — but if absent (direct API call), duplicate ERP orders can be created.

**Fix:** Always store `erpOrderId` returned from ERP on the eshop order immediately after first successful creation.

---

### 6. Order-Delivered Webhook Not Implemented on ERP Side
The eshop has a `/api/webhooks/erp/order-delivered` receiver (also requiring `x-erp-timestamp`) but the ERP has no equivalent `enqueueOrderDeliveredWebhook` function.

**Fix:** Implement `lib/eshopDeliveredWebhook.ts` triggered when admin marks eshop order as delivered.

---

## Medium Findings

### 7. Manual Admin Sync Ignores M15 Override Protection
**File:** `src/app/api/admin/erp/sync/route.ts:81-119` (eshop)

Real-time push webhook correctly skips stock update if `variant.stock !== variant.erpStock` (manual override detected). Manual admin sync unconditionally overwrites stock, silently undoing admin overrides.

**Fix:** Apply same `stock === erpStock` guard in manual sync endpoint.

### 8. Order Status State Machine Not Enforced
ERP 'paid' maps to eshop 'PROCESSING'. Status transitions not strictly validated, allowing status regressions.

**Fix:** Document and code-enforce state machine: `PAID → (ERP sync) → PROCESSING → SHIPPED → DELIVERED`.

### 9. Invoice PDF Not Resendable After Sync Failure
If ERP sync fails all 3 retry attempts, customer never receives invoice. No admin UI action to resend.

**Fix:** Add admin "Resend invoice email" action for orders with `erpSyncStatus=sync_failed`.

### 10. No API Versioning or Formal Contract
Integration endpoints have no `/v1/` prefix. No OpenAPI spec. Breaking changes silently break consumers.

**Fix:** Add `/v1/` prefix to all external endpoints. Generate OpenAPI spec from Zod schemas.

---

## Low Findings

- No alerting for stock sync failures (only `console.warn`)
- `ERP_API_KEY` shared in eshop environment for all ERP access (including invoice PDF fetch) — create scoped read-only key
- Checkout shipping cost hardcoded (99 CZK) instead of reading from `ShippingMethod` DB table — inconsistency if DB price changes

