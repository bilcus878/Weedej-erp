-- Batch / Lot tracking (Šarže) — enterprise-grade implementation
-- Adds Batch master entity + batchId FK to ReceiptItem and InventoryItem
-- Adds batchTracking flag to Product
-- All columns have safe defaults — zero impact on existing data
-- Idempotent: IF NOT EXISTS prevents failure on re-run

-- 1. Batch master table
CREATE TABLE IF NOT EXISTS "Batch" (
  "id"             TEXT         NOT NULL,
  "batchNumber"    TEXT         NOT NULL,
  "productId"      TEXT         NOT NULL,
  "productionDate" TIMESTAMP(3),
  "expiryDate"     TIMESTAMP(3),
  "supplierLotRef" TEXT,
  "supplierId"     TEXT,
  "receivedDate"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"         TEXT         NOT NULL DEFAULT 'active',
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Batch_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "Batch_batchNumber_productId_key" UNIQUE ("batchNumber", "productId"),
  CONSTRAINT "Batch_productId_fkey"    FOREIGN KEY ("productId")  REFERENCES "Product"("id")  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Batch_supplierId_fkey"   FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Batch_productId_idx"    ON "Batch"("productId");
CREATE INDEX IF NOT EXISTS "Batch_status_idx"       ON "Batch"("status");
CREATE INDEX IF NOT EXISTS "Batch_expiryDate_idx"   ON "Batch"("expiryDate");
CREATE INDEX IF NOT EXISTS "Batch_batchNumber_idx"  ON "Batch"("batchNumber");
CREATE INDEX IF NOT EXISTS "Batch_receivedDate_idx" ON "Batch"("receivedDate");

-- 2. batchId on InventoryItem (stock movements)
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
ALTER TABLE "InventoryItem" DROP CONSTRAINT IF EXISTS "InventoryItem_batchId_fkey";
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "InventoryItem_batchId_idx" ON "InventoryItem"("batchId");

-- 3. batchId on ReceiptItem (inbound line items)
ALTER TABLE "ReceiptItem" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
ALTER TABLE "ReceiptItem" DROP CONSTRAINT IF EXISTS "ReceiptItem_batchId_fkey";
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ReceiptItem_batchId_idx" ON "ReceiptItem"("batchId");

-- 4. batchTracking flag on Product (opt-in per product)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "batchTracking" BOOLEAN NOT NULL DEFAULT FALSE;
