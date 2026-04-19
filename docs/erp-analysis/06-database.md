# Database & Schema Design — Score: 6/10

## Critical Findings

### 1. Schema Managed via `db push --accept-data-loss` (No Migration History)
**File:** `prisma/schema.prisma`

No `migrations/` directory. `prisma db push --accept-data-loss` in build script silently drops columns/data. Rollback is impossible.

**Fix:**
```bash
npx prisma migrate dev --name init   # baseline current schema
# Then in package.json:
"build": "prisma generate && prisma migrate deploy && next build"
```

---

### 2. N+1 Stock Calculation — Missing `GROUP BY` Index
**File:** `lib/stockCalculation.ts`

`getAllProductsStock()` runs 4 separate queries per product. No composite index on `InventoryItem(productId, quantity)`.

**Fix:**
```prisma
model InventoryItem {
  @@index([productId, quantity])  // add this
}
```
Replace per-product loop with `prisma.inventoryItem.groupBy({ by: ['productId'], _sum: { quantity: true } })`.

---

## High Findings

### 3. Missing FK — `InventuraItem.productId`
`InventuraItem` has `productId String` but no `@relation` to `Product`. Referential integrity not enforced — product can be deleted while inventory records reference it.

**Fix:**
```prisma
model InventuraItem {
  product   Product @relation(fields: [productId], references: [id])
}
```

### 4. Missing FK — `BlogPost.authorId`
Dangling reference — no join path to the author entity.

**Fix:** If authors are ERP Users: add `author User @relation(...)`. If freeform text: rename to `authorName String`.

### 5. `EshopCartItem.quantity` Wrong Type (Int instead of Decimal)
Cannabis products require fractional quantities (3.5g). `Int` loses the decimal part on save.

**Fix:**
```prisma
model EshopCartItem {
  quantity Decimal @db.Decimal(10,3) @default(1)  // was: Int @default(1)
}
```

### 6. `ShippingMethod.price` Wrong Type (Int instead of Decimal)
Monetary amounts should be `Decimal` for consistency with all other price fields.

**Fix:** `price Decimal @db.Decimal(10,2) @default(0)`, `freeThreshold Decimal? @db.Decimal(10,2)`

### 7. Missing `taxableSupplyDate` (DUZP) — Czech ZDPH §28 Requirement
Czech law requires the "datum uskutečnění zdanitelného plnění" on every invoice. Neither `IssuedInvoice` nor `ReceivedInvoice` has this field.

**Fix:**
```prisma
model IssuedInvoice {
  taxableSupplyDate DateTime?  // DUZP — §28 ZDPH
}
```

### 8. Missing VAT Breakdown Per Rate on Invoices
Czech ZDPH requires per-rate VAT breakdown (21%, 12%, 0% listed separately). Currently only total aggregates stored. Historical PDFs will show wrong breakdowns if item rates change.

**Fix:**
```prisma
model IssuedInvoiceVatBreakdown {
  id          String       @id @default(cuid())
  invoiceId   String
  invoice     IssuedInvoice @relation(fields: [invoiceId], references: [id])
  vatRate     Decimal      @db.Decimal(5,2)
  baseAmount  Decimal      @db.Decimal(12,2)
  vatAmount   Decimal      @db.Decimal(12,2)
  totalAmount Decimal      @db.Decimal(12,2)
}
```

### 9. Dual Document Numbering System (Settings + DocumentSeries)
`Settings` model retains 10 legacy counter columns alongside `DocumentSeries`. Risk of split-brain numbering.

**Fix:** Audit all reads of `Settings.last*` fields. Drop the 10 columns via migration once confirmed unused.

### 10. Inconsistent Soft Delete
`Product`, `Customer`, `Supplier`, `User` have no `deletedAt` field. Hard deletion of these entities orphans historical financial records.

**Fix:**
```prisma
model Product {
  deletedAt DateTime?
  @@index([deletedAt])
}
// Same for Customer, Supplier, User
```

---

## Medium Findings

- `stornoBy` is free-text `String` — not a FK to `User` (no audit join path)
- `EshopVariant.variantValue` is `Float?` (IEEE 754 rounding errors) — change to `Decimal? @db.Decimal(10,3)`
- Missing composite index `CustomerOrder @@index([status, orderDate])` for most common query pattern
- Missing composite index `EshopWebhookLog @@index([status, nextRetryAt])` for retry cron query
- `ReceivedInvoice` has no `supplierId` FK — can't join to supplier by ID
- `EshopSetting.updatedAt` missing `@updatedAt` directive and `createdAt` field

---

## Low Findings

- Mixed PascalCase/camelCase relation back-reference names in Prisma schema
- `IssuedInvoice` has no `companyBankAccount` snapshot field — changing `Settings.bankAccount` would affect historical invoice PDF regeneration
- `InventoryItem.vatRate` stored but never used for stock valuation — either implement valuation or remove field
- `DocumentSeries.documentType` lacks DB-level CHECK constraint — invalid type strings accepted

