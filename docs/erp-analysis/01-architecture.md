# Architecture Analysis — Score: 5/10

## Critical Findings

### 1. Duplicate Invoice Endpoints (3 overlapping routes)
**File:** `app/api/invoices/issued/route.ts`, `app/api/issued-invoices/route.ts`

Issued invoices are served by three separate overlapping routes querying different Prisma models (`Transaction` vs `IssuedInvoice`). Consumers cannot know which to trust; business logic is duplicated.

**Fix:** Consolidate to one canonical endpoint. Mark `/api/invoices/issued` as a deprecated compatibility shim. All new code must use `IssuedInvoice` model exclusively.

---

### 2. `/api/settings/reset-database` Has No Auth Guard
**File:** `app/api/settings/reset-database/route.ts`

Deletes all transactional data with zero session check inside the handler. Any authenticated user can wipe the database.

**Fix:**
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// Also verify admin role once RBAC is added
```

---

### 3. N+1 in `getAllProductsStock()`
**File:** `lib/stockCalculation.ts`

3 DB queries per product fired inside a loop. For 100 products = 300+ round-trips.

**Fix:**
```typescript
// Replace per-product loop with 3 bulk queries:
const stockByProduct = await prisma.inventoryItem.groupBy({
  by: ['productId'],
  _sum: { quantity: true },
})
const reservedByProduct = await prisma.reservation.groupBy({
  by: ['productId'],
  where: { status: 'active' },
  _sum: { quantity: true },
})
// Join in JS
```

---

### 4. Document Sequence Number Dual System
**File:** `prisma/schema.prisma` (Settings model), `lib/documentNumbering.ts`

`Settings` model still has 10 legacy counter columns alongside the new `DocumentSeries` model. Two numbering systems = risk of duplicate document numbers.

**Fix:** Audit all reads of `Settings.last*` fields. Replace with `previewNextDocumentNumber()`. Delete the 10 counter columns via migration.

---

## High Findings

### 5. EshopUser Models in ERP Schema (Bounded Context Violation)
`EshopUser`, `EshopCart`, `EshopCartItem`, `ShippingMethod`, `BlogPost`, `EshopSetting` all live in the ERP schema. These belong to the eshop bounded context.

**Fix:** Reference eshop users by ID string only (not FK relation) in ERP. Separate schemas physically.

### 6. No API Versioning
All routes at root path. Breaking changes silently break consumers.

**Fix:** Add `/api/v1/` prefix to all external-facing routes.

### 7. Three Customer Order Creation Routes
`/api/orders`, `/api/external/orders`, `/api/customer-orders` — overlapping work, different validation, different side effects.

**Fix:** Extract shared `lib/createCustomerOrder.ts` service. Route handlers orchestrate only.

### 8. Ad-Hoc Error Handling Per Route
No centralized error handling. Different error shapes across routes.

**Fix:**
```typescript
// lib/apiError.ts
export function apiError(message: string, status: number, details?: string) {
  return NextResponse.json({ code: status, message, details }, { status })
}
```

### 9. Transaction Model Dual Purpose
`Transaction` serves both SumUp POS sales and issued invoices. `IssuedInvoice` was added later as the correct domain object but both are in active use.

**Fix:** Define deprecation plan. `IssuedInvoice` is canonical. Migrate SumUp transactions to create `IssuedInvoice` via `lib/createIssuedInvoice.ts`.

### 10. Middleware Auth Bypass Too Broad
`/api/invoices/` prefix in `PUBLIC_API_PREFIXES` exposes ALL invoice sub-routes (including internal listing) to unauthenticated access.

**Fix:** Replace broad prefix with exact path matching. Only `/api/invoices/[id]/pdf` needs public access.

---

## Medium Findings

- No CQRS read model for dashboard — every load recomputes from full tables
- No input validation with Zod on most routes (only `/api/orders` has it)
- 4 PDF generation modules with overlapping responsibility — consolidate to `lib/pdf/`
- `DocumentType` has dual kebab-case + snake_case variants causing two numbering sequences
- CRON_SECRET optional bypass makes cron endpoint public if env var absent
- CORS wildcard fallback on external API endpoints

---

## Low Findings

- 15+ markdown files cluttering root directory — move to `/docs/`
- No domain events or audit log (required by Czech law §35 ZDPH for 10-year trail)
- Only 2 test files for complex business logic

