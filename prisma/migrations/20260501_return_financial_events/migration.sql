-- Migration: return financial events + credit note audit fields + payment provider fields

-- ReturnRequest: payment provider integration fields
ALTER TABLE "ReturnRequest"
  ADD COLUMN IF NOT EXISTS "externalTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "refundProviderData"     JSONB;

-- CreditNote: audit trail snapshots
ALTER TABLE "CreditNote"
  ADD COLUMN IF NOT EXISTS "vatBreakdown"        JSONB,
  ADD COLUMN IF NOT EXISTS "calculationVersion"  TEXT;

-- ReturnFinancialEvent: immutable financial event journal
CREATE TABLE IF NOT EXISTS "ReturnFinancialEvent" (
  "id"              TEXT        NOT NULL,
  "returnRequestId" TEXT        NOT NULL,
  "eventType"       TEXT        NOT NULL,
  "amount"          DECIMAL(10,2) NOT NULL,
  "amountNet"       DECIMAL(10,2),
  "amountVat"       DECIMAL(10,2),
  "currency"        TEXT        NOT NULL DEFAULT 'CZK',
  "creditNoteId"    TEXT,
  "metadata"        JSONB       NOT NULL DEFAULT '{}',
  "actorId"         TEXT,
  "actorName"       TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReturnFinancialEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReturnFinancialEvent_returnRequestId_fkey"
    FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ReturnFinancialEvent_returnRequestId_idx" ON "ReturnFinancialEvent"("returnRequestId");
CREATE INDEX IF NOT EXISTS "ReturnFinancialEvent_eventType_idx"       ON "ReturnFinancialEvent"("eventType");
CREATE INDEX IF NOT EXISTS "ReturnFinancialEvent_createdAt_idx"       ON "ReturnFinancialEvent"("createdAt");
