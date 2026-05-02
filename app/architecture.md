# app/ — Architecture

`app/` is the **Next.js App Router layer**. It contains two completely different things sharing the same directory tree:

1. **Page files** (`page.tsx`) — thin React Server Component shells that render frontend features
2. **API route handlers** (`route.ts`) — REST endpoints that execute server-side business logic

Understanding the split is critical: pages delegate everything to `features/`, API routes delegate everything to `lib/`.

---

## Directory structure

```
app/
  layout.tsx               — root layout (Navbar, Providers, global CSS)
  page.tsx                 — dashboard (/)
  globals.css              — Tailwind base styles
  login/
    page.tsx               — unauthenticated login page
  {feature}/
    page.tsx               — list/index page for a feature
    [id]/
      page.tsx             — detail page for a single entity
  api/
    auth/
      [...nextauth]/
        route.ts           — NextAuth catch-all handler
    {feature}/
      route.ts             — GET (list) + POST (create)
      [id]/
        route.ts           — GET (one) + PATCH (update) + DELETE
        {action}/
          route.ts         — specific business action (cancel, ship, storno…)
    external/              — public API (API key auth, no session required)
    cron/                  — scheduled jobs (CRON_SECRET auth)
    integrations/          — third-party push receivers (SumUp, etc.)
```

---

## The thin page pattern

Every `app/{feature}/page.tsx` follows the same shape:

```tsx
// app/customer-orders/page.tsx
'use client'

import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import { useCustomerOrders, createCustomerOrderColumns } from '@/features/customer-orders'

export const dynamic = 'force-dynamic'

export default function CustomerOrdersPage() {
  const { ep, filters } = useCustomerOrders()

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header title="Vystavené objednávky" ... />
      <EntityPage.Table columns={createCustomerOrderColumns(filters)} rows={ep.paginated} ... />
      <EntityPage.Pagination ... />
    </EntityPage>
  )
}
```

**Rules for page files:**
- `'use client'` — all data fetching is client-side (no RSC data fetching via `fetch` in page components)
- `export const dynamic = 'force-dynamic'` — opt out of static generation globally
- Maximum ~70 lines. If a page grows beyond that, move logic into the feature's hook or a new component
- No direct `fetch()` calls in page files — always delegate to a feature hook
- No Prisma, no auth checks, no `lib/` imports in page files

---

## Data fetching strategy

**Client-side only.** There are no React Server Components that fetch data. All data flows through this chain:

```
page.tsx
  → feature hook (useXxx)
    → feature service (fetchXxx — wraps fetch())
      → app/api/... route handler
        → Prisma → PostgreSQL
```

This approach was chosen for simplicity over RSC streaming. The tradeoff is initial load latency vs. architecture complexity. Do not introduce RSC data fetching without explicit alignment — it would create two different patterns in the same codebase.

---

## Root layout

```
app/layout.tsx
```

The single root layout wraps every page. It provides:
- `<Providers>` — NextAuth `SessionProvider`
- `<NavbarMetaProvider>` — context for navbar badge counters (pending orders, shipments)
- `<ErpNavbar>` — the persistent top navigation bar
- `<main>` — page content area with top padding offset for the fixed navbar

**There are no nested layouts.** Every feature page uses the root layout directly. Do not create feature-level layouts without a specific reason (e.g., a public-facing page that should hide the navbar).

---

## API route handler pattern

Every route handler follows this structure:

```ts
// app/api/customer-orders/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/platform/db/prisma'
import { requireAuth } from '@/lib/platform/auth/routeGuard'
import { logAudit } from '@/lib/platform/audit/auditService'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 1. Auth check
  const guard = await requireAuth()
  if (!guard.ok) return guard.error

  // 2. Parse input
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')

  // 3. Query / business logic
  const orders = await prisma.customerOrder.findMany({ where: { customerId } })

  // 4. Return
  return NextResponse.json(orders)
}

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (!guard.ok) return guard.error

  const body = await request.json()

  // Validate input at boundary
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Delegate complex logic to lib/features/
  const order = await createCustomerOrder(parsed.data, guard.ctx)

  // Audit trail for mutating actions
  await logAudit({ action: 'create', entity: 'CustomerOrder', entityId: order.id, ...guard.ctx })

  return NextResponse.json(order, { status: 201 })
}
```

**Rules for route handlers:**
- Auth first — every handler starts with a guard call. No exceptions.
- Validate at the boundary with Zod before touching the database
- Complex business logic lives in `lib/features/`, not inline in the handler
- Simple CRUD (findMany, findUnique, create, update, delete) can stay inline if it fits in ~20 lines
- All mutating actions (POST, PATCH, DELETE) log to audit trail via `logAudit()`
- Return `{ error: string }` for errors, never leak stack traces

---

## Auth architecture

Authentication is layered:

```
middleware.ts          (Edge runtime, JWT only — fast path)
  ↓ rejects unauthenticated requests before they reach route handlers
  ↓ rejects ADMIN_ONLY routes for non-admin JWT tokens

app/api/*/route.ts     (Node.js runtime, full DB access)
  ↓ requireAuth()       — validates session, no permission check
  ↓ requirePermission() — validates session + checks specific permission in DB
  ↓ requireAdmin()      — validates session + checks ADMIN role in DB
```

**Why two layers?**

The Edge middleware is fast but can only read the JWT (no DB access). It handles coarse-grained checks (authenticated vs. not). Fine-grained RBAC happens in the route handler where a live DB call confirms current permissions — even if the user's role was revoked mid-session.

**Public API routes** (no session required):
```
/api/external/*     — API key authentication (for eshop integration)
/api/orders         — legacy endpoint (API key)
/api/cron/*         — CRON_SECRET header authentication
```

**Admin-only routes** (checked in middleware + enforced in handler):
```
/api/users
/api/roles
/api/permissions
```

---

## API route naming conventions

| Pattern | Purpose | Example |
|---|---|---|
| `GET /api/{entity}` | List all | `GET /api/customer-orders` |
| `POST /api/{entity}` | Create | `POST /api/customer-orders` |
| `GET /api/{entity}/[id]` | Get one | `GET /api/customer-orders/abc123` |
| `PATCH /api/{entity}/[id]` | Update | `PATCH /api/customer-orders/abc123` |
| `DELETE /api/{entity}/[id]` | Delete | `DELETE /api/customer-orders/abc123` |
| `POST /api/{entity}/[id]/{action}` | State transition | `POST /api/customer-orders/abc123/cancel` |
| `GET /api/{entity}/next-number` | Sequence | `GET /api/customer-orders/next-number` |
| `GET /api/{entity}/[id]/pdf` | Document export | `GET /api/invoices/abc123/pdf` |

Action routes (`cancel`, `ship`, `storno`, `process`, `approve`, `reject`) represent state machine transitions. They should:
1. Load the entity
2. Validate the transition is allowed
3. Execute the transition
4. Return the updated entity

---

## Special API segments

### `/api/external/`

Public REST API consumed by the Weedej e-shop. Authentication via `X-API-Key` header (handled in `lib/platform/auth/apiKeyAuth.ts`). No session cookie required.

Endpoints:
- `GET /api/external/products` — product catalog with stock levels
- `GET /api/external/inventory` — stock summary
- `GET /api/external/stock` — per-variant stock levels
- `POST /api/external/orders` — receive order from e-shop

### `/api/cron/`

Scheduled jobs called by Vercel Cron. Authenticated via `Authorization: Bearer {CRON_SECRET}` header.

- `POST /api/cron/webhook-retry` — retry failed webhook deliveries
- `POST /api/cron/analytics-retry` — retry failed analytics event sends

### `/api/integrations/`

Push receivers for third-party services.

- `POST /api/integrations/sumup` — SumUp payment event webhook

---

## What belongs in `app/`, what doesn't

| Belongs in `app/` | Does NOT belong in `app/` |
|---|---|
| Page shell components | Business logic |
| API route handlers | React components (beyond minimal wiring) |
| Route-level auth guards | Data transformation |
| `export const dynamic` declarations | Reusable hooks |
| Next.js metadata exports | Prisma queries (if complex, move to `lib/features/`) |

---

## Adding a new page

1. Create `app/{feature}/page.tsx` — thin shell, delegates to `features/{feature}`
2. Add navigation entry in `config/nav.ts`
3. No other changes needed in `app/` — the root layout picks it up automatically

## Adding a new API endpoint

1. Create `app/api/{entity}/route.ts`
2. Start with `requireAuth()` or `requirePermission()`
3. Validate input with Zod
4. Complex logic → `lib/features/`, simple CRUD → inline Prisma
5. Log mutations with `logAudit()`
6. Add the corresponding frontend service function in `features/{entity}/services/{entity}Service.ts`