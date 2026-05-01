-- ReturnRequest: add currency and refundStatus fields.
--
-- currency: ISO 4217 code, default CZK. Immutable after creation.
--   Exists to guard against cross-currency operations in future multi-currency scenarios.
--   All existing rows are correctly CZK.
--
-- refundStatus: separates CreditNote creation (accounting document) from actual money movement.
--   none      — no refund initiated
--   pending   — CreditNote issued, awaiting payment execution
--   completed — money confirmed transferred
--   failed    — execution failed, manual intervention required

ALTER TABLE "ReturnRequest"
    ADD COLUMN "currency"     TEXT NOT NULL DEFAULT 'CZK',
    ADD COLUMN "refundStatus" TEXT NOT NULL DEFAULT 'none';

CREATE INDEX "ReturnRequest_refundStatus_idx" ON "ReturnRequest"("refundStatus");
CREATE INDEX "ReturnRequest_currency_idx"     ON "ReturnRequest"("currency");
