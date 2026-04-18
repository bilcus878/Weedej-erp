-- Variant fulfillment: add base-unit tracking to CustomerOrderItem + DeliveryNoteItem

-- CustomerOrderItem: store variant metadata and shipped base quantity
ALTER TABLE "CustomerOrderItem"
  ADD COLUMN IF NOT EXISTS "variantValue"   DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS "variantUnit"    TEXT,
  ADD COLUMN IF NOT EXISTS "shippedBaseQty" DECIMAL(10,3) NOT NULL DEFAULT 0;

-- Backfill shippedBaseQty from existing shippedQuantity (correct for ks items; variant items were 0 anyway)
UPDATE "CustomerOrderItem" SET "shippedBaseQty" = "shippedQuantity";

-- Backfill variantValue + variantUnit from productName pattern "Name — Xunit"
-- Supports: g, ml, ks  (e.g. "CBD Olej — 5g" → variantValue=5, variantUnit='g')
UPDATE "CustomerOrderItem"
SET
  "variantValue" = CAST(
    (REGEXP_MATCH("productName", ' — (\d+(?:\.\d+)?)(g|ml|ks)$'))[1] AS DECIMAL
  ),
  "variantUnit" = (REGEXP_MATCH("productName", ' — (\d+(?:\.\d+)?)(g|ml|ks)$'))[2]
WHERE "productName" ~ ' — \d+(?:\.\d+)?(g|ml|ks)$';

-- Also backfill shippedBaseQty for variant items that already have shipments
-- shippedBaseQty = shippedQuantity * variantValue (packs × grams-per-pack)
UPDATE "CustomerOrderItem"
SET "shippedBaseQty" = "shippedQuantity" * "variantValue"
WHERE "variantValue" IS NOT NULL
  AND "shippedQuantity" > 0;

-- DeliveryNoteItem: store base-unit context for variant delivery items
ALTER TABLE "DeliveryNoteItem"
  ADD COLUMN IF NOT EXISTS "baseQuantity" DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS "baseUnit"     TEXT;
