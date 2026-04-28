-- SKU / EAN product identification on EshopVariant
-- Business rule: every variant must carry a unique SKU; EAN is optional but also unique when set.
--
-- Design decisions:
--   • Both columns are nullable at the database level so that existing rows are unaffected.
--     The application layer (API routes) enforces that new variants must supply a SKU.
--   • PostgreSQL's UNIQUE constraint on a nullable column correctly allows many NULLs
--     (each NULL is treated as distinct), which is the desired backward-compatible behaviour.
--   • The partial index on ean (WHERE ean IS NOT NULL) makes uniqueness checks fast and
--     avoids the planner having to consider NULL rows when enforcing the constraint.
--   • Idempotent: all statements use IF NOT EXISTS / DROP … IF EXISTS to allow safe re-runs.

-- 1. Add sku column — unique across all EshopVariant rows (NULLs allowed for legacy rows)
ALTER TABLE "EshopVariant" ADD COLUMN IF NOT EXISTS "sku" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"EshopVariant"'::regclass
      AND conname  = 'EshopVariant_sku_key'
  ) THEN
    ALTER TABLE "EshopVariant" ADD CONSTRAINT "EshopVariant_sku_key" UNIQUE ("sku");
  END IF;
END $$;

-- 2. Add ean column — unique when present (NULLs allowed — EAN is optional)
ALTER TABLE "EshopVariant" ADD COLUMN IF NOT EXISTS "ean" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"EshopVariant"'::regclass
      AND conname  = 'EshopVariant_ean_key'
  ) THEN
    ALTER TABLE "EshopVariant" ADD CONSTRAINT "EshopVariant_ean_key" UNIQUE ("ean");
  END IF;
END $$;

-- 3. B-tree index on sku — accelerates lookup-by-SKU queries (e.g. barcode scanner, import)
CREATE INDEX IF NOT EXISTS "EshopVariant_sku_idx" ON "EshopVariant"("sku");

-- 4. Partial index on ean (only non-NULL rows) — zero overhead for variants without EAN
CREATE INDEX IF NOT EXISTS "EshopVariant_ean_idx" ON "EshopVariant"("ean")
  WHERE "ean" IS NOT NULL;
