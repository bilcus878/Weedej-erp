-- Add provider, codFee, note to ShippingMethod.
-- All new columns have safe defaults — existing rows remain valid.
-- Idempotent: IF NOT EXISTS prevents failure on re-run.

ALTER TABLE "ShippingMethod" ADD COLUMN IF NOT EXISTS "provider"      TEXT         NOT NULL DEFAULT 'custom';
ALTER TABLE "ShippingMethod" ADD COLUMN IF NOT EXISTS "codFee"        INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE "ShippingMethod" ADD COLUMN IF NOT EXISTS "note"          TEXT;
