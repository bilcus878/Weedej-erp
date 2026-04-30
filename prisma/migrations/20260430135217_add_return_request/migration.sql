-- Returns / Claims / Refunds module
-- Adds: ReturnRequest, ReturnRequestItem, ReturnStatusHistory, ReturnAttachment
-- Modifies: CreditNote (returnRequestId), Customer, CustomerOrder, EshopUser,
--           User, Product, InventoryItem (back-relation columns not needed in DB)

CREATE TABLE "ReturnRequest" (
    "id"                   TEXT          NOT NULL,
    "returnNumber"         TEXT          NOT NULL,
    "customerOrderId"      TEXT,
    "transactionId"        TEXT,
    "customerId"           TEXT,
    "eshopUserId"          TEXT,
    "customerName"         TEXT,
    "customerEmail"        TEXT,
    "customerPhone"        TEXT,
    "customerAddress"      TEXT,
    "type"                 TEXT          NOT NULL DEFAULT 'return',
    "reason"               TEXT          NOT NULL,
    "reasonDetail"         TEXT,
    "status"               TEXT          NOT NULL DEFAULT 'submitted',
    "requestDate"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnDeadline"       TIMESTAMP(3),
    "warrantyExpiry"       TIMESTAMP(3),
    "returnShippingPaidBy" TEXT,
    "returnTrackingNumber" TEXT,
    "returnCarrier"        TEXT,
    "returnShippingCost"   DECIMAL(10,2),
    "resolutionType"       TEXT,
    "refundAmount"         DECIMAL(10,2),
    "refundMethod"         TEXT,
    "refundReference"      TEXT,
    "refundProcessedAt"    TIMESTAMP(3),
    "adminNote"            TEXT,
    "rejectionReason"      TEXT,
    "handledById"          TEXT,
    "exchangeOrderId"      TEXT,
    "createdAt"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3)  NOT NULL,
    "closedAt"             TIMESTAMP(3),

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReturnRequestItem" (
    "id"                       TEXT         NOT NULL,
    "returnRequestId"          TEXT         NOT NULL,
    "productId"                TEXT,
    "productName"              TEXT,
    "unit"                     TEXT         NOT NULL,
    "originalQuantity"         DECIMAL(10,3) NOT NULL,
    "returnedQuantity"         DECIMAL(10,3) NOT NULL,
    "approvedQuantity"         DECIMAL(10,3),
    "unitPrice"                DECIMAL(10,2) NOT NULL,
    "unitPriceWithVat"         DECIMAL(10,2) NOT NULL,
    "vatRate"                  DECIMAL(5,2)  NOT NULL DEFAULT 21,
    "condition"                TEXT,
    "conditionNote"            TEXT,
    "itemStatus"               TEXT          NOT NULL DEFAULT 'pending',
    "itemRejectionReason"      TEXT,
    "restockInventoryItemId"   TEXT,
    "createdAt"                TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReturnStatusHistory" (
    "id"              TEXT         NOT NULL,
    "returnRequestId" TEXT         NOT NULL,
    "fromStatus"      TEXT,
    "toStatus"        TEXT         NOT NULL,
    "changedBy"       TEXT,
    "changedByName"   TEXT,
    "note"            TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReturnAttachment" (
    "id"              TEXT         NOT NULL,
    "returnRequestId" TEXT         NOT NULL,
    "url"             TEXT         NOT NULL,
    "filename"        TEXT         NOT NULL,
    "mimeType"        TEXT,
    "sizeBytes"       INTEGER,
    "type"            TEXT         NOT NULL DEFAULT 'other',
    "uploadedBy"      TEXT,
    "uploadedByName"  TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnAttachment_pkey" PRIMARY KEY ("id")
);

-- Add returnRequestId to CreditNote
ALTER TABLE "CreditNote" ADD COLUMN "returnRequestId" TEXT;

-- Unique constraints
CREATE UNIQUE INDEX "ReturnRequest_returnNumber_key"              ON "ReturnRequest"("returnNumber");
CREATE UNIQUE INDEX "ReturnRequest_exchangeOrderId_key"          ON "ReturnRequest"("exchangeOrderId");
CREATE UNIQUE INDEX "ReturnRequestItem_restockInventoryItemId_key" ON "ReturnRequestItem"("restockInventoryItemId");
CREATE UNIQUE INDEX "CreditNote_returnRequestId_key"             ON "CreditNote"("returnRequestId");

-- Performance indexes
CREATE INDEX "ReturnRequest_returnNumber_idx"     ON "ReturnRequest"("returnNumber");
CREATE INDEX "ReturnRequest_customerOrderId_idx"  ON "ReturnRequest"("customerOrderId");
CREATE INDEX "ReturnRequest_customerId_idx"       ON "ReturnRequest"("customerId");
CREATE INDEX "ReturnRequest_status_idx"           ON "ReturnRequest"("status");
CREATE INDEX "ReturnRequest_requestDate_idx"      ON "ReturnRequest"("requestDate");
CREATE INDEX "ReturnRequest_type_idx"             ON "ReturnRequest"("type");

CREATE INDEX "ReturnRequestItem_returnRequestId_idx" ON "ReturnRequestItem"("returnRequestId");
CREATE INDEX "ReturnRequestItem_productId_idx"       ON "ReturnRequestItem"("productId");

CREATE INDEX "ReturnStatusHistory_returnRequestId_idx" ON "ReturnStatusHistory"("returnRequestId");
CREATE INDEX "ReturnStatusHistory_createdAt_idx"       ON "ReturnStatusHistory"("createdAt");

CREATE INDEX "ReturnAttachment_returnRequestId_idx" ON "ReturnAttachment"("returnRequestId");

-- Foreign keys
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_customerOrderId_fkey"
    FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_eshopUserId_fkey"
    FOREIGN KEY ("eshopUserId") REFERENCES "EshopUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_handledById_fkey"
    FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_exchangeOrderId_fkey"
    FOREIGN KEY ("exchangeOrderId") REFERENCES "CustomerOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_returnRequestId_fkey"
    FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_restockInventoryItemId_fkey"
    FOREIGN KEY ("restockInventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnStatusHistory" ADD CONSTRAINT "ReturnStatusHistory_returnRequestId_fkey"
    FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReturnAttachment" ADD CONSTRAINT "ReturnAttachment_returnRequestId_fkey"
    FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_returnRequestId_fkey"
    FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
