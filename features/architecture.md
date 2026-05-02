# features/ — Architecture

`features/` is the **frontend business layer**. It owns everything between the UI framework (`components/`) and the HTTP boundary (`app/api/`). A feature is a self-contained vertical slice: types, API client, state management, domain logic, and React components — all scoped to one business domain.

---

## Feature anatomy

Every feature follows an identical internal structure:

```
features/{feature-name}/
  components/         — React components specific to this feature
  hooks/              — React hooks for state management
  services/           — API client functions (fetch wrappers)
  types.ts            — TypeScript types for this feature's domain
  index.ts            — public API (explicit exports only)
  domain/             — (optional) pure transformations: mappers, selectors
  constants.ts        — (optional) enum-like values, label maps
  utils.ts            — (optional) pure helper functions
```

---

## Sub-directory responsibilities

### `services/`

The only place where `fetch()` is called to hit the backend.

```ts
// features/customer-orders/services/customerOrderService.ts

export async function fetchCustomerOrders(): Promise<CustomerOrder[]> {
  const res = await fetch('/api/customer-orders')
  if (!res.ok) throw new Error('Nepodařilo se načíst objednávky')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function cancelCustomerOrder(orderId: string): Promise<void> {
  const res = await fetch(`/api/customer-orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Nepodařilo se zrušit objednávku')
  }
}
```

**Rules:**
- One service file per feature, named `{feature}Service.ts`
- Functions throw `Error` on failure — never return `null` to signal errors
- No state, no side effects other than the fetch call itself
- Do not import React here

---

### `hooks/`

State containers for feature pages. Hooks compose service calls, filter state, and pagination into a single object returned to the page.

```ts
// features/customer-orders/hooks/useCustomerOrders.ts

export function useCustomerOrders() {
  const filters = useFilters<CustomerOrder>([...])

  const ep = useEntityPage<CustomerOrder>({
    fetchData: fetchCustomerOrders,
    getRowId: r => r.id,
    filterFn: filters.fn,
  })

  return { ep, filters }
}
```

**Hook naming:**
- `useXxx` — list hook (manages the full list page state)
- `useXxxDetail` — detail hook (manages a single entity's state and actions)
- `useXxxActions` — mutation-only hook (cancel, approve, reject, etc.)
- `useXxxForm` — form state for create/edit modals
- `useXxxProcessing` — multi-step workflow state (shipment processing, etc.)

**Rules:**
- Hooks call services, never fetch directly
- All async errors should surface through `ep.error` or local state — never throw from a hook
- Keep hooks focused: `useCustomerOrders` (list state) ≠ `useCustomerOrderDetail` (single entity)

---

### `components/`

Feature-specific React components. These are **not** reusable across features — they encode business logic specific to this domain.

Common patterns:
- `XxxStatusBadge.tsx` — status chip with domain-specific color logic
- `XxxColumns.tsx` — table column definitions (`createXxxColumns(filters)`)
- `CreateXxxForm.tsx` — create modal form
- `XxxDetailHeader.tsx` — top section of a detail page
- `ProcessXxxModal.tsx` — multi-step action modal

**Rules:**
- Components here may import from `components/erp/` and `components/ui/`
- Components here do NOT import from other feature folders
- Business state lives in hooks, not components — components receive props

---

### `domain/`

Pure transformations with no side effects. Present in features that have complex mapping between API shape and UI shape.

```ts
// features/customer-orders/domain/customerOrderMapper.ts

export function mapCustomerOrderToOrderDetail(order: CustomerOrder): OrderDetailData {
  return {
    id: order.id,
    customerName: order.customer?.name || order.customerName || 'Anonymní odběratel',
    // ... field mapping, fallbacks, computed fields
  }
}
```

```ts
// features/issued-invoices/domain/invoiceStatus.ts

export function resolveInvoiceStatus(invoice: IssuedInvoice): InvoiceUIStatus {
  if (invoice.status === 'storno') return 'storno'
  if (invoice.paidAt) return 'paid'
  if (new Date(invoice.dueDate) < new Date()) return 'overdue'
  return 'pending'
}
```

**Use `domain/` when:**
- The API response shape differs significantly from what the UI needs
- Status/label resolution requires non-trivial logic
- Multiple components need the same transformation

**Do NOT use `domain/` for:**
- Fetch calls (→ `services/`)
- React state management (→ `hooks/`)
- Components (→ `components/`)

---

### `types.ts`

All TypeScript types for the feature. Typically mirrors the Prisma model but with UI-specific extensions.

```ts
// features/customer-orders/types.ts

export interface CustomerOrder {
  id:          string
  orderNumber: string
  status:      'new' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'storno'
  totalAmount: number
  customer?:   { name: string; email?: string }
  items:       OrderItem[]
  issuedInvoice?: { id: string; invoiceNumber: string; paymentType: string }
  // ...
}

export interface CreateOrderPayload {
  customerId:  string
  items:       { productId: string; quantity: number; unitPrice: number }[]
  // ...
}
```

**Rules:**
- Define types here that exactly match what the API returns (based on Prisma `include` shape)
- Create separate `CreateXxxPayload` / `UpdateXxxPayload` types for mutation inputs
- Enums as union string types — no TypeScript `enum` keyword (harder to serialize)

---

### `index.ts`

Explicit exports only. The index is the feature's public API — not a re-export of everything.

```ts
// features/customer-orders/index.ts

export { useCustomerOrders } from './hooks/useCustomerOrders'
export { useCustomerOrderDetail } from './hooks/useCustomerOrderDetail'
export { useCustomerOrderActions } from './hooks/useCustomerOrderActions'
export { useCreateOrderForm } from './hooks/useCreateOrderForm'
export { createCustomerOrderColumns } from './components/customerOrderColumns'
export { CreateCustomerOrderForm } from './components/CreateCustomerOrderForm'
export { CustomerOrderStatusBadge } from './components/CustomerOrderStatusBadge'
export type { CustomerOrder, CreateOrderPayload } from './types'
```

Import from `@/features/customer-orders`, never from deep paths like `@/features/customer-orders/hooks/useCustomerOrders`.

---

### `features/shared/`

Cross-feature constants that don't belong to any single feature.

```
features/shared/
  paymentOptions.ts   — payment method select options (used by multiple features)
```

Use sparingly. If code is only used by one feature, keep it in that feature's folder. `features/shared/` is for things like payment method lists that are genuinely shared across invoices, orders, and transactions.

---

## Complete feature list

| Feature | Domain |
|---|---|
| `accounting-export` | Accounting export wizard (Pohoda, Money S3, CSV) |
| `analytics` | Business analytics dashboard with KPIs |
| `audit-logs` | Audit log viewer |
| `batches` | Batch/lot tracking for products |
| `credit-notes` | Credit notes (dobropisy) |
| `crm` | CRM: contacts, interactions, opportunities, tasks, timeline |
| `customer-orders` | Customer orders (non-eshop, manual) |
| `customers` | Customer registry |
| `dashboard` | Main dashboard with KPI cards and action center |
| `delivery-notes` | Delivery notes (dodací listy) |
| `eshop-orders` | Orders imported from the Weedej e-shop |
| `inventory` | Stock levels, movements, manual adjustments |
| `inventura` | Physical stock count (inventura) |
| `invoices-received` | Received invoices (přijaté faktury) |
| `issued-invoices` | Issued invoices (vystavené faktury) |
| `products` | Product catalog with variants and e-shop sync |
| `purchase-orders` | Purchase orders to suppliers (objednávky dodavatelům) |
| `receipts` | Cash receipts (pokladní doklady) |
| `returns` | Return/warranty/complaint workflow |
| `roles` | RBAC role and permission management |
| `settings` | Company settings, invoicing config, API keys |
| `shipping` | Shipping method configuration |
| `suppliers` | Supplier registry |
| `transactions` | SumUp payment transaction sync |
| `users` | User management |

---

## Separation of concerns

```
Page (app/)
  → renders loading/error states
  → composes EntityPage.Header + EntityPage.Table
  → passes hook output directly to components

Hook (features/*/hooks/)
  → owns ALL async state (data, loading, error)
  → calls service functions
  → composes useEntityPage + useFilters from components/erp/
  → never touches DOM

Service (features/*/services/)
  → wraps fetch()
  → throws on HTTP error
  → no state, no React

Component (features/*/components/)
  → receives data as props
  → handles UI interactions, calls back up via callbacks
  → imports from components/erp/ and components/ui/
```

---

## Adding a new feature

Follow these steps exactly. Do not skip steps.

### 1. Create the folder structure

```bash
features/
  {feature-name}/
    components/
    hooks/
    services/
    domain/          # only if you need mappers
    types.ts
    index.ts
```

### 2. Define types first

In `types.ts`, define:
- The main entity interface (matches what the API returns)
- Payload types for create/update
- Any status enums as union types

### 3. Write the service

In `services/{feature}Service.ts`:
- `fetchXxx()` — GET list
- `fetchXxxById(id)` — GET one
- `createXxx(payload)` — POST
- `updateXxx(id, payload)` — PATCH
- `deleteXxx(id)` — DELETE
- `{action}Xxx(id)` — POST to action endpoints

### 4. Write the hooks

In `hooks/`:
- `useXxx.ts` — list page hook using `useEntityPage` + `useFilters`
- `useXxxDetail.ts` — detail page hook
- `useXxxActions.ts` — if the detail page has many action buttons

### 5. Build the components

In `components/`:
- `{feature}Columns.tsx` — column definitions for the list table
- `XxxStatusBadge.tsx` — status display chip
- Create/Edit modal if needed

### 6. Wire the index

Export everything public from `index.ts`. Only export what a page file actually needs.

### 7. Create the pages

In `app/{feature}/page.tsx` and `app/{feature}/[id]/page.tsx`.

### 8. Create the API routes

In `app/api/{feature}/route.ts` and sub-routes. Always start with auth guard.

### 9. Add navigation

In `config/nav.ts`, add the new route.

---

## Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| `fetch()` directly in a component | Bypasses service layer, untestable | Move to service, consume via hook |
| Prisma import in a feature service | `features/` is frontend-only | Prisma is `lib/platform/` — call it via API |
| Feature A importing from Feature B | Creates coupling | Extract to `features/shared/` or `components/shared/` |
| All state in a page component | Page becomes a God component | Extract into feature hook |
| Business logic in a `XxxColumns.tsx` file | Column definitions aren't business logic | Move to `domain/` or `hooks/` |
| Types duplicated across features | Drift over time | Define in the owning feature, import from its `index.ts` |
| `index.ts` re-exports everything | Exposes internals | Export only what pages actually need |