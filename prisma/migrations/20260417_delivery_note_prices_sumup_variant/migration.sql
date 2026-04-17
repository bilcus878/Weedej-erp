-- Migration: delivery note price fields + isSumup on EshopVariant
-- Reason: delivery notes must carry the same prices as their source invoice (§ 28 ZDPH)

-- Add price fields to DeliveryNoteItem
ALTER TABLE "DeliveryNoteItem"
  ADD COLUMN IF NOT EXISTS "price"        DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "priceWithVat" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "vatAmount"    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "vatRate"      DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "priceSource"  TEXT;

-- Add isSumup flag to EshopVariant
ALTER TABLE "EshopVariant"
  ADD COLUMN IF NOT EXISTS "isSumup" BOOLEAN NOT NULL DEFAULT false;
