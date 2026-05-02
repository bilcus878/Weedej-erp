# Weedej ERP — Architecture Overview

This document is the authoritative reference for the system's architecture. When in doubt about where code belongs, what pattern to follow, or how modules connect — start here.

---

## What is this system?

An internal ERP for Weedej (cannabis wellness products). It manages:
- **Warehouse** — stock levels, batch/lot tracking, physical stocktaking
- **Sales** — customer orders, e-shop order import, delivery notes, issued invoices
- **Purchasing** — purchase orders to suppliers, received goods (receipts), received invoices
- **Finance** — cash transactions (SumUp), accounting exports (Pohoda, Money S3, CSV)
- **CRM** — customer contacts, interaction history, opportunities, tasks
- **Returns** — full return/warranty/complaint workflow with refund processing
- **Analytics** — KPI dashboard with GA4 and Meta Ads integration
- **Administration** — RBAC roles/permissions, users, audit logs

---

## Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL via Prisma 5 |
| Authentication | NextAuth v4 (credential-based) |
| Authorization | Custom RBAC (Role → Permission) |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| PDF generation | pdfmake + jspdf |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Vercel |
| Payment integration | SumUp REST API |

---

## Module map

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│                                                                 │
│  app/{feature}/page.tsx  ◄─── thin React shell, no logic      │
│       │                                                         │
│       ▼                                                         │
│  features/{feature}/                                            │
│    hooks/      ── state management (useEntityPage, useFilters) │
│    services/   ── fetch() wrappers                              │
│    components/ ── domain-specific React components             │
│    domain/     ── pure transformations (mappers, selectors)    │
│       │                                                         │
│       ▼                                                         │
│  components/                                                    │
│    erp/    ── ERP framework (layout, list, detail, filters)    │
│    ui/     ── UI primitives (Button, Modal, Badge, etc.)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (fetch)
┌────────────────────────────▼────────────────────────────────────┐
│  Next.js API routes  (app/api/*/route.ts)                       │
│                                                                 │
│  middleware.ts ── Edge JWT auth (fast path)                     │
│       │                                                         │
│       ▼                                                         │
│  lib/                                                           │
│    platform/   ── DB (Prisma), auth guards, PDF, storage       │
│    features/   ── business orchestration (multi-step logic)    │
│    shared/     ── pure domain logic (VAT, money, dates)        │
│    core/       ── HTTP utilities (errors, rate limiting)       │
│       │                                                         │
│       ▼                                                         │
│  PostgreSQL (via Prisma)                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data flow (request lifecycle)

A complete request from user interaction to database and back:

```
1. User clicks "Vytvořit objednávku"
   → CreateCustomerOrderForm component calls openModal()

2. User fills form, submits
   → CreateCustomerOrderForm calls hook callback: onSuccess()
   → useCreateOrderForm hook calls:
       customerOrderService.createCustomerOrder(payload)

3. Service sends HTTP request:
   POST /api/customer-orders
   Body: { customerId, items, paymentType, ... }

4. API route handler (app/api/customer-orders/route.ts):
   a. requireAuth() — validates NextAuth session via DB
   b. Zod schema parse — validates request body
   c. Prisma transaction — creates CustomerOrder + OrderItems + Reservations
   d. lib/features/eshop/reservationManagement — stock reservation
   e. lib/platform/documents/DocumentArchiveService — async PDF archival
   f. lib/platform/audit/auditService — logs the action
   g. Returns JSON { id, orderNumber, ... }

5. Service receives 201 response, resolves promise

6. Hook calls ep.refresh() → re-fetches the order list

7. UI updates with new order highlighted via ?highlight=orderId
```

---

## Authentication & authorization

### Session flow

```
User submits login form
  → POST /api/auth/callback/credentials
  → NextAuth verifies password (bcrypt)
  → Creates JWT token with { id, email, roles[] }
  → Sets httpOnly cookie

Subsequent requests:
  → middleware.ts reads JWT (Edge runtime, no DB)
    → Rejects unauthenticated: redirect to /login
    → Rejects non-ADMIN on /api/users, /api/roles, /api/permissions: 403
  → Route handler calls requirePermission('orders:write')
    → Loads current roles from DB (not JWT) — revocations take effect instantly
    → Returns 403 if permission missing
```

### RBAC model

```
User ──► UserRole ──► Role ──► RolePermission ──► Permission
```

Permissions are defined as string constants in `lib/shared/permissions.ts`. Each defines one capability (e.g., `invoices:write`, `inventory:read`).

The `PermissionGate` component hides UI elements for unauthorized users. The API guard enforces the same check server-side — the UI gate is cosmetic only.

---

## Key architectural decisions

### 1. Client-side data fetching only

All data is fetched client-side via `fetch()` from feature services. React Server Components exist in name (all pages use `'use client'`) but do not fetch data. This simplifies mental model: one data path, one loading state pattern, no hydration mismatches.

*Tradeoff:* Slower initial page loads than RSC streaming. Acceptable for an internal tool.

### 2. Thin pages, fat features

`app/{feature}/page.tsx` files are ~50 lines maximum. All business state lives in `features/{name}/hooks/`. This keeps pages readable and makes the logic testable independently of Next.js routing.

### 3. lib/ is server-only

`lib/` contains zero React, zero browser APIs. It's importable from Node.js scripts, Vitest tests, and route handlers alike. This boundary prevents accidental server logic leaking into the browser bundle.

### 4. Auth revocation takes effect instantly

Permission checks in API routes always hit the database (`requirePermission`, `requireAdmin`). The JWT cache is only used for coarse routing in the Edge middleware. A revoked role blocks access on the next request, not the next login.

### 5. Audit trail on all mutations

Every POST/PATCH/DELETE that changes business data writes to `AuditLog` via `lib/platform/audit/auditService`. The audit log is append-only. No business action is silent.

### 6. Document numbers are sequential and domain-prefixed

All document numbers follow the pattern `{PREFIX}{YEAR}{SEQ}` (e.g., `OBJ202600142`, `FAK202600089`). The sequence is managed in `lib/shared/documents/documentSeries.ts` using a DB-level atomic counter. Never generate document numbers in application logic.

---

## Module interactions

Some modules have non-obvious dependencies:

| When... | It calls... | Why |
|---|---|---|
| Customer order is created | `reservationManagement` | Reserves stock so it's not double-sold |
| Customer order is shipped | `createDeliveryNote` + `createIssuedInvoice` | Automated document generation |
| Delivery note is processed | Stock movement recorded | Inventory decremented |
| Purchase order is received | Receipt created + stock increased | Goods-in flow |
| Return is resolved | `returnRefundService` creates CreditNote | Refund document trail |
| Return goods received | `returnStockService` | Stock restored if appropriate |
| Issued invoice created | `archiveAsync` | PDF stored to disk/cloud |
| E-shop order arrives | `POST /api/external/orders` → Prisma + webhooks | Via external API |

---

## External integrations

| Integration | Direction | Entry point |
|---|---|---|
| Weedej e-shop | Bi-directional | `/api/external/*` (inbound), `lib/platform/webhooks/` (outbound) |
| SumUp | Inbound sync | `GET /api/transactions/sync` → `lib/platform/payments/sumup.ts` |
| SumUp webhook | Inbound push | `POST /api/integrations/sumup` |
| Google Analytics 4 | Outbound events | `lib/features/analytics/providers/ga4/` |
| Meta Ads | Outbound events | `lib/features/analytics/providers/meta/` |
| Pohoda / Money S3 | Export only | `lib/features/accounting/adapters/` |
| Vercel Cron | Scheduled jobs | `/api/cron/*` |

---

## Database schema overview

Key entities and their relationships:

```
Product ─────────────────────────────────────────────────────────
  └── EshopVariant (size/weight variants for e-shop)
  └── InventoryItem (current stock level per product)
  └── StockMovement (every in/out event)
  └── Batch (lot tracking)

CustomerOrder ────────────────────────────────────────────────────
  └── OrderItem (product, qty, price snapshot)
  └── Reservation (soft stock hold)
  └── DeliveryNote (shipping document)
  └── IssuedInvoice (billing document)
  └── ReturnRequest (return/warranty)

PurchaseOrder ────────────────────────────────────────────────────
  └── PurchaseOrderItem
  └── Receipt (goods received)
  └── ReceivedInvoice (supplier invoice)

Transaction (SumUp) ──────────────────────────────────────────────
  └── (linked to EshopOrder or CustomerOrder)

EshopOrder ───────────────────────────────────────────────────────
  └── EshopOrderItem
  └── (may generate CustomerOrder)

User ─────────────────────────────────────────────────────────────
  └── UserRole → Role → RolePermission → Permission

AuditLog ─────────────────────────────────────────────────────────
  └── append-only, references any entity by entityId + entityType

CrmContact / CrmInteraction / CrmOpportunity / CrmTask ──────────
  └── linked to Customer
```

---

## Adding a new feature — end-to-end checklist

### Backend (lib/ + app/api/)

- [ ] Add Prisma model in `prisma/schema.prisma`
- [ ] Run `prisma migrate dev --name add_{feature}`
- [ ] Add permission constants in `lib/shared/permissions.ts`
- [ ] Add domain constants in `lib/shared/constants/{feature}.ts`
- [ ] Add business logic in `lib/features/{feature}/`
- [ ] Create API routes in `app/api/{feature}/route.ts`
- [ ] Add auth guards (`requireAuth` or `requirePermission`) to every handler
- [ ] Add `logAudit()` to every mutating handler

### Frontend (features/ + app/)

- [ ] Create `features/{feature}/types.ts`
- [ ] Create `features/{feature}/services/{feature}Service.ts`
- [ ] Create `features/{feature}/hooks/use{Feature}.ts`
- [ ] Create `features/{feature}/components/{Feature}StatusBadge.tsx`
- [ ] Create `features/{feature}/components/{feature}Columns.tsx`
- [ ] Create `features/{feature}/index.ts`
- [ ] Create `app/{feature}/page.tsx` (thin shell)
- [ ] Create `app/{feature}/[id]/page.tsx` if detail view needed
- [ ] Add entry in `config/nav.ts`
- [ ] Add seed data in `prisma/seed-rbac.ts` if new permissions added

---

## Project-level file index

| Path | Role |
|---|---|
| `app/` | Next.js pages and API routes |
| `app/layout.tsx` | Root layout (Navbar, Providers) |
| `app/api/auth/` | NextAuth handler |
| `components/erp/` | ERP framework components |
| `components/ui/` | UI primitives |
| `config/nav.ts` | Navigation structure |
| `docs/` | Architecture and analysis docs |
| `features/` | Frontend business layer |
| `lib/core/` | HTTP utilities |
| `lib/features/` | Server-side business orchestration |
| `lib/platform/` | Infrastructure adapters |
| `lib/shared/` | Pure domain logic |
| `middleware.ts` | Edge auth (JWT check) |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.ts` | Development data seed |
| `prisma/seed-rbac.ts` | RBAC roles/permissions seed |
| `scripts/` | Dev tooling (create-admin, reset-db) |
| `tests/` | Vitest unit tests |
| `types/` | Global TypeScript augmentations |
| `utils/cn.ts` | Tailwind class merge utility |

---

## Further reading

| Document | Contents |
|---|---|
| [lib/ARCHITECTURE.md](../lib/ARCHITECTURE.md) | lib/ layer rules, import graph, naming |
| [app/architecture.md](../app/architecture.md) | App Router, API route patterns, auth layers |
| [features/architecture.md](../features/architecture.md) | Feature anatomy, hooks/services/components, how to add a feature |
| [components/architecture.md](../components/architecture.md) | Component hierarchy, ERP framework, useEntityPage |
| [docs/erp-analysis/01-architecture.md](erp-analysis/01-architecture.md) | Original architecture analysis |
| [docs/erp-analysis/02-security.md](erp-analysis/02-security.md) | Security review |