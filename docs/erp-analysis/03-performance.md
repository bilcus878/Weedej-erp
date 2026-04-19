# Performance Analysis — Score: 3/10

## Critical Findings

### 1. N+1 Queries — `getAllProductsStock()` and `/api/inventory/summary`
**File:** `lib/stockCalculation.ts:178`, `app/api/inventory/summary/route.ts`

Fires 3–4 separate DB queries per product. 100 products = 300–400 round-trips.

**Fix:**
```typescript
// Replace per-product loop:
const stockRows = await prisma.inventoryItem.groupBy({
  by: ['productId'],
  _sum: { quantity: true },
})
const reservedRows = await prisma.reservation.groupBy({
  by: ['productId'],
  where: { status: 'active' },
  _sum: { quantity: true },
})
const expectedRows = await prisma.inventoryItem.groupBy({
  by: ['productId'],
  where: { quantity: { gt: 0 }, receiptId: { not: null } },
  _sum: { quantity: true },
})
// Build Map<productId, stock> in JS — 3 queries total vs 300+
```

---

### 2. Over-fetching — `/api/stats` Loads Full Transaction History
**File:** `app/api/stats/route.ts`

Loads every product with ALL inventory items AND ALL transaction items on every dashboard load. For 50 products and 5,000 transactions = megabytes of data just to compute 6 numbers.

**Fix:**
```typescript
// Use aggregates instead of findMany + JS reduce:
const todayRevenue = await prisma.issuedInvoice.aggregate({
  where: { invoiceDate: { gte: startOfToday } },
  _sum: { totalAmountWithVat: true },
})
```

---

### 3. No Pagination on Any List Endpoint
**Files:** `app/api/inventory/route.ts`, `app/api/receipts/route.ts`, `app/api/customer-orders/route.ts`, `app/api/eshop-orders/route.ts`, `app/api/transactions/route.ts`

All return unbounded full-table results. Transactions route defaults to `limit=999999`.

**Fix:**
```typescript
// Add to all list routes:
const { page = '1', limit = '50' } = searchParams
const skip = (parseInt(page) - 1) * parseInt(limit)
const [items, total] = await Promise.all([
  prisma.xxx.findMany({ take: parseInt(limit), skip }),
  prisma.xxx.count({ where }),
])
return NextResponse.json({ items, total, page, pages: Math.ceil(total / parseInt(limit)) })
```

---

## High Findings

### 4. N+1 in Order Creation — Per-Item Product Lookup
**File:** `app/api/orders/route.ts:172-184`

One DB query per order line item to resolve product IDs.

**Fix:**
```typescript
const skus = body.items.map(i => i.sku)
const products = await prisma.product.findMany({ where: { id: { in: skus } }, select: { id: true } })
const productMap = new Map(products.map(p => [p.id, p]))
```

### 5. N+1 in `createReservations()` — One INSERT Per Item
**File:** `lib/reservationManagement.ts:29-48`

Sequential `reservation.create()` per item inside a loop.

**Fix:**
```typescript
await client.reservation.createMany({ data: items.map(i => ({ productId: i.productId, ... })) })
```

### 6. Prisma Query Logging Active in Production
**File:** `lib/prisma.ts:12`

`log: ['query', 'error', 'warn']` unconditionally. Logs all SQL to Vercel drain (billable, adds latency).

**Fix:**
```typescript
log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
```

### 7. Missing Index on `InventoryItem.supplierId`
Add `@@index([supplierId])` to `InventoryItem` in schema.

### 8. Missing Compound Index `EshopWebhookLog(status, nextRetryAt)`
Cron query `WHERE status='retrying' AND nextRetryAt <= now()` uses separate single-column indexes. Add `@@index([status, nextRetryAt])`.

### 9. No Caching Strategy
Every route has `force-dynamic`. High-read, low-write data (products, categories, settings) fetched fresh on every request.

**Fix:**
```typescript
import { unstable_cache } from 'next/cache'
const getProducts = unstable_cache(
  async () => prisma.product.findMany({ where: { active: true } }),
  ['products'],
  { revalidate: 60, tags: ['products'] }
)
```

### 10. Stock-per-Product in `notifyEshopStockUpdate()` — N+1
**File:** `lib/eshopStockWebhook.ts:51-57`

One `calculateCurrentStock(id)` per product in `Promise.all`.

**Fix:** Single `groupBy` query for all affected product IDs.

---

## Medium Findings

- `/api/inventory/summary` loads all `inventoryItems` per product for avg price — use aggregate instead
- `canReserveQuantity` called serially per item in customer-order POST (10+ queries for 5-item order)
- Deep nested includes on list endpoints produce large payloads — add `?view=list` vs `?view=detail`
- `/api/products` loads ALL inventory+transaction items to compute `stockQuantity` in JS — use groupBy
- No HTTP response compression configured in `next.config.js`

---

## Low Findings

- Prisma singleton lacks `connection_limit` and `pool_timeout` configuration — risk of pool exhaustion under load
- `DocumentSeries` number generation could contend under high concurrent order creation — consider PostgreSQL SEQUENCE

