# lib/ — Architecture

`lib/` is the **server-side backbone** of the application. It contains zero React, zero browser APIs, and zero Next.js route handlers. Every `.ts` file in here must be importable from a plain Node.js script.

---

## The four layers

```
lib/
  core/       HTTP framework — middleware, error shapes, response helpers
  platform/   Infrastructure — Prisma, auth, PDF, payments, storage, crypto, webhooks
  shared/     Pure domain logic — no I/O, no side effects, no DB access
  features/   Business orchestration — coordinates platform + shared to fulfill a use case
```

Every file belongs to exactly one layer. If you can't decide, use the decision tree below.

---

## Decision tree

| Question | Answer | Layer |
|---|---|---|
| Does it call Prisma, read a file, hit an external API? | yes | `platform/` |
| Is it a pure function that transforms data or validates? | yes | `shared/` |
| Does it orchestrate a multi-step business workflow? | yes | `features/` |
| Does it shape an HTTP error, parse headers, or sit in a middleware chain? | yes | `core/` |
| Is it unused by anything? | — | **DELETE** |

---

## Import rules

```
core     ──►  (nothing inside lib/)
shared   ──►  (nothing inside lib/)
platform ──►  core, shared
features ──►  core, platform, shared   (NOT other lib/features/)
```

App routes and frontend pages (`app/`, `features/`, `components/`) may import from any lib layer.

Cross-feature imports inside `lib/features/` are forbidden **by default**. When one is genuinely necessary, document it in the exceptions section at the bottom of this file.

---

## Layer details

### `lib/core/`

Stateless HTTP utilities. Nothing here should know about business domain.

```
lib/core/
  api/
    apiError.ts         — standard error class with HTTP status codes
    idempotency.ts      — idempotency key extraction & validation
    responseWrapper.ts  — typed JSON response helpers (ok, created, badRequest…)
  middleware/
    apiPipeline.ts      — composable middleware runner for route handlers
    corsGuard.ts        — CORS header enforcement
    csrfGuard.ts        — CSRF token verification
    rateLimiter.ts      — per-IP rate limiting (in-memory sliding window)
```

> **⚠️ NOT YET WIRED** — `rateLimiter`, `corsGuard`, `csrfGuard`, `apiPipeline` are implemented and tested but are not wired into any route handler. Wire them before enabling any public-facing or unauthenticated endpoint. See `/api/external/` routes as the first priority.

---

### `lib/platform/`

Stateful adapters to external systems and infrastructure. Files here contain exactly one kind of side effect.

```
lib/platform/
  auth/
    auth.ts               — NextAuth configuration (authOptions)
    apiKeyAuth.ts         — API key authentication for /api/external/ routes
    routeGuard.ts         — requireAuth(), requirePermission(), requireAdmin()
  audit/
    auditService.ts       — writes AuditLog records; called after mutating actions
  crypto/
    integrationCrypto.ts  — AES-GCM encryption for integration secrets
  db/
    prisma.ts             — singleton PrismaClient (connection pooling, logging)
  documents/
    DocumentArchiveService.ts — async PDF generation + storage after document creation
  payments/
    sumup.ts              — SumUp REST API client (fetch transactions, receipts)
  pdf/
    generateInvoicePDF.ts       — pdfmake document definition for invoices
    generateEshopOrderPDF.ts    — pdfmake document definition for e-shop orders
    serverInvoicePdf.ts         — server-side PDF buffer generation entry point
    serverPdfGenerators.ts      — unified dispatcher for all document types
    types.ts                    — PDF template types
  storage/
    StorageAdapter.ts     — interface for file storage (read/write/delete)
    LocalDiskAdapter.ts   — filesystem implementation of StorageAdapter
    PathResolver.ts       — canonical path computation for stored documents
  webhooks/
    eshopWebhook.ts       — sends order/stock events to the e-shop via webhook
    eshopStockWebhook.ts  — dedicated stock-level webhook dispatcher
```

**Key rule:** One file = one external system. `sumup.ts` only knows about SumUp. `prisma.ts` only knows about the database connection. Never mix.

---

### `lib/shared/`

Pure functions. Import nothing from inside `lib/`. Safe to call from anywhere, including tests.

```
lib/shared/
  commerce/
    shippingCalculator.ts   — shipping cost calculation rules
  constants/
    customerOrder.ts        — status lists, labels for customer orders
    deliveryNote.ts         — delivery note statuses and labels
    invoice.ts              — invoice types, payment statuses
    purchaseOrder.ts        — purchase order statuses
    receipt.ts              — receipt statuses
    refund.ts               — refund method options
  dates/
    format.ts               — date formatting utilities (CZ locale)
  documents/
    documentSeries.ts       — next document number generation (OBJ-, FAK-, PRI-, …)
  finance/
    money.ts                — rounding, currency formatting (Decimal-safe)
    vatCalculation.ts       — VAT rate application, gross/net conversions, line totals
  inventory/
    formatVariantQty.ts     — display formatting for variant quantities
    packQuantity.ts         — pack vs. unit quantity conversion
    stockMovement.ts        — stock movement direction enum and helpers
    variantConversion.ts    — product variant ↔ pack unit conversions
  permissions.ts            — Permission enum (all permission keys as string literals)
  products/
    eanValidation.ts        — EAN-8 / EAN-13 check digit validation
  units/
    format.ts               — measurement unit display formatting
  validation/
    zodSchemas.ts           — reusable Zod schemas (ICO, EAN, phone, …)
```

**No God file.** Each sub-folder owns exactly one domain. A new domain → a new sub-folder. Never add a shared utility to an existing domain file if it belongs elsewhere.

---

### `lib/features/`

Business orchestration. Each sub-folder is a use-case domain, not a repeat of a frontend feature. These are the files that get called from `app/api/` route handlers.

```
lib/features/
  accounting/
    adapters/         — format-specific export adapters (Pohoda XML, Money S3, generic CSV)
    renderers/        — output renderers (CSV bytes, XLSX buffer, ZIP archive)
    exportJob.ts      — top-level accounting export orchestration
    normalizer.ts     — maps ERP documents to accounting-neutral format
    vatSummary.ts     — VAT summary computation for export
    types.ts          — export format types
  analytics/
    analyticsCache.ts       — in-memory TTL cache for analytics queries
    comparisonEngine.ts     — period-over-period comparison logic
    dateRange.ts            — date range parsing and preset resolution
    eventPipeline.ts        — GA4/Meta event normalization and persistence
    exportEngine.ts         — analytics data → CSV/XLSX export
    hmac.ts                 — HMAC signature for webhook verification
    metricsCalculator.ts    — aggregation formulas for KPIs
    providers/              — GA4 and Meta Ads API clients + mappers
    types.ts
  documents/
    storno.ts               — generic document cancellation (sets status=storno, records reason)
  eshop/
    reservationManagement.ts — stock reservation lifecycle (create, release, confirm)
  inventory/
    batchUtils.ts           — batch/lot tracking helpers
  invoices/
    createIssuedInvoice.ts  — creates an IssuedInvoice from a CustomerOrder
  orders/
    createDeliveryNote.ts   — creates a DeliveryNote from a CustomerOrder
    getOrderLineItems.ts    — reads order lines (used by invoice creation)
  products/
    skuGeneration.ts        — SKU generation from product + variant attributes
    variantIdentification.ts — variant uniqueness / lookup by SKU or EAN
  returns/
    ReturnCommandService.ts       — command bus for return workflow transitions
    ReturnEventBus.ts             — internal event publishing (return status changed, etc.)
    ReturnFinancialConsistency.ts — invariant checks for refund amounts
    ReturnValidationService.ts    — pre-condition validation for each workflow step
    returnMapper.ts               — DB row → domain object mapping
    returnRefundService.ts        — refund execution (credit note creation, financial events)
    returnStockService.ts         — stock restoration after goods received
    returnWorkflow.ts             — state machine: allowed transitions per status
```

**Naming inside `lib/features/`:** Use verb+noun for action files (`createDeliveryNote.ts`, not `deliveryNoteCreator.ts`). Use noun+Domain for services (`ReturnCommandService.ts`). The name must describe what the file **does**, not what it **is**.

---

## Naming conventions

| Type | Convention | Example |
|---|---|---|
| Action / use-case file | `verbNoun.ts` | `createIssuedInvoice.ts` |
| Service class | `NounService.ts` | `ReturnCommandService.ts` |
| Adapter | `format-variant.ts` (kebab) | `money-s3.ts`, `generic-csv.ts` |
| Constant file | noun of domain | `customerOrder.ts` |
| Type-only file | `types.ts` | every feature folder |

**No root-level `.ts` files in `lib/`.** Every file lives in a named sub-directory.

---

## Adding new code

1. **Classify** with the decision tree above.
2. **Name** the file after what it does, not what it is.
3. **No root files** — every file lives in a sub-folder.
4. **No shims** — if the interface changes, update callers immediately. Backwards-compat wrappers accumulate rot.
5. **Test `shared/`** — pure functions are trivially testable. If you can't write a unit test for something in `shared/`, it probably belongs in `features/` or `platform/`.

---

## Anti-patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| Prisma call inside `lib/shared/` | Breaks purity, makes functions un-testable | Move to `lib/platform/` or `lib/features/` |
| React import in any `lib/` file | `lib/` is server-only | Move to `features/` (frontend) or `components/` |
| One `lib/features/` file importing another | Creates hidden coupling | Extract shared logic to `lib/shared/` |
| `lib/shared/utils.ts` catch-all | Becomes a God file over time | Create a focused sub-folder |
| Environment variable read in `lib/shared/` | Not pure | Move to `lib/platform/` (inject as parameter if needed in shared) |

---

## Cross-feature exceptions

Document every cross-feature import here. Keep the list short.

| Importer | Imported | Reason |
|---|---|---|
| `lib/features/invoices/createIssuedInvoice.ts` | `lib/features/orders/getOrderLineItems` | Invoice creation needs to read order lines. `getOrderLineItems` is read-only and stable — acceptable coupling. |