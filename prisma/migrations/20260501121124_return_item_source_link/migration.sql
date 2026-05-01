-- ReturnRequestItem.sourceOrderItemId — traceability link to the original CustomerOrderItem.
-- Nullable so existing rows are unaffected. The API uses it to fetch authoritative prices
-- from the original order rather than trusting client-supplied values.

ALTER TABLE "ReturnRequestItem"
    ADD COLUMN "sourceOrderItemId" TEXT;

CREATE INDEX "ReturnRequestItem_sourceOrderItemId_idx"
    ON "ReturnRequestItem"("sourceOrderItemId");

ALTER TABLE "ReturnRequestItem"
    ADD CONSTRAINT "ReturnRequestItem_sourceOrderItemId_fkey"
    FOREIGN KEY ("sourceOrderItemId")
    REFERENCES "CustomerOrderItem"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
