-- Add shipping method + pickup point + billing address snapshot to CustomerOrder.
-- All columns are nullable — existing orders keep NULL (no backfill needed).
-- Idempotent: IF NOT EXISTS prevents failure on repeated application.

-- Shipping method
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "shippingMethod"     TEXT;

-- Pickup point (all four fields together, always written as a set)
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "pickupPointId"      TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "pickupPointName"    TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "pickupPointAddress" TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "pickupPointCarrier" TEXT;

-- Billing address snapshot (immutable after creation; NULL = same as delivery)
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "billingName"        TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "billingCompany"     TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "billingIco"         TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "billingDic"         TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "billingStreet"      TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "billingCity"        TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "billingZip"         TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "billingCountry"     TEXT;

-- Indexes for efficient queries (e.g. all Zásilkovna pickup orders for batch label export)
CREATE INDEX IF NOT EXISTS "CustomerOrder_shippingMethod_idx"     ON "CustomerOrder"("shippingMethod");
CREATE INDEX IF NOT EXISTS "CustomerOrder_pickupPointCarrier_idx" ON "CustomerOrder"("pickupPointCarrier");
