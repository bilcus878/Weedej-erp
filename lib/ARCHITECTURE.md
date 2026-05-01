# lib/ Architecture

Four strict layers. Every `.ts` file belongs in exactly one.

```
lib/
  core/       API framework — middleware, errors, pipeline (HTTP-aware, no DB)
  platform/   Infrastructure — Prisma, auth, PDF, payments, storage, crypto
  shared/     Pure domain logic — no DB, no HTTP, no side effects
  features/   Business orchestration — imports core + platform + shared
```

## Decision tree

| Question | Layer |
|---|---|
| Uses Prisma / external I/O? | `platform/` |
| Pure function, no side effects? | `shared/` |
| Orchestrates a business flow? | `features/` |
| HTTP middleware / error shape? | `core/` |
| Unused anywhere? | **DELETE** |

## Import rules

```
core      → nothing inside lib/
platform  → core, shared
shared    → nothing inside lib/
features  → core, platform, shared   (NOT other features)
```

App routes and frontend pages import from any layer.

## Cross-feature exceptions (document here, keep short)

- `lib/features/invoices/createIssuedInvoice.ts` imports `lib/features/orders/getOrderLineItems` —
  invoice creation needs to read order lines; acceptable because orders is read-only here.

## lib/core/middleware — NOT YET WIRED

`rateLimiter`, `corsGuard`, `csrfGuard`, `apiPipeline` exist and are correct but are not
hooked into any route handler yet. Wire them before enabling public-facing endpoints.

## Constants

Split by domain under `lib/shared/constants/`:
`customerOrder`, `deliveryNote`, `invoice`, `purchaseOrder`, `receipt`, `refund`

No God constants file. Add a new file per domain.

## Adding new code

1. Classify with the decision tree above.
2. Name the file after what it does, not what it is (`createDeliveryNote.ts` not `deliveryNoteService.ts`).
3. Zero root-level `.ts` files in `lib/` — every file lives in a named subdirectory.
4. Shims are forbidden — update callers on the spot or delete unused code.
