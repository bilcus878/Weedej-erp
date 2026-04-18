-- Migration: Add variantValue and variantUnit to Reservation
-- Fixes reserved stock calculation for variant products (e.g. 2 × 3ml = 6ml)

ALTER TABLE "Reservation"
  ADD COLUMN IF NOT EXISTS "variantValue" DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS "variantUnit"  VARCHAR;

-- Backfill existing active reservations from their linked CustomerOrderItem.
-- Matches by (customerOrderId, productId) — the same pair used when creating reservations.
-- Only backfills rows where CustomerOrderItem.unit = 'ks' (new variant format),
-- so old-format orders (unit='ml') are left with variantValue = NULL and treated as
-- already-converted base-unit quantities by calculateReservedStock().
UPDATE "Reservation" r
SET
  "variantValue" = coi."variantValue",
  "variantUnit"  = coi."variantUnit"
FROM "CustomerOrderItem" coi
WHERE coi."customerOrderId" = r."customerOrderId"
  AND coi."productId"       = r."productId"
  AND r."variantValue"      IS NULL
  AND coi."unit"            = 'ks'
  AND coi."variantValue"    IS NOT NULL
  AND coi."variantUnit"     IS NOT NULL
  AND coi."variantUnit"    <> 'ks';
