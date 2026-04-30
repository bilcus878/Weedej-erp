-- ============================================================
-- Marketing Analytics: create AnalyticsEvent, AnalyticsEventDelivery,
-- AnalyticsSession tables from scratch (missing from prior migrations).
-- All statements use IF NOT EXISTS so re-runs are safe.
-- ============================================================

-- CreateTable: AnalyticsEvent
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id"              TEXT         NOT NULL,
  "eventId"         TEXT         NOT NULL,
  "eventType"       TEXT         NOT NULL,
  "entityType"      TEXT,
  "entityId"        TEXT,
  "userId"          TEXT,
  "sessionId"       TEXT,
  "gaClientId"      TEXT,
  "fbp"             TEXT,
  "fbc"             TEXT,
  "erpCustomerId"   TEXT,
  "erpOrderId"      TEXT,
  "source"          TEXT         NOT NULL,
  "properties"      JSONB        NOT NULL,
  "ipAddress"       TEXT,
  "userAgent"       TEXT,
  "utmSource"       TEXT,
  "utmMedium"       TEXT,
  "utmCampaign"     TEXT,
  "utmContent"      TEXT,
  "utmTerm"         TEXT,
  "referrer"        TEXT,
  "landingPage"     TEXT,
  "clientTimestamp" TIMESTAMP(3) NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsEvent_eventId_key"              ON "AnalyticsEvent"("eventId");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_eventType_createdAt_idx"          ON "AnalyticsEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_userId_createdAt_idx"             ON "AnalyticsEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_source_createdAt_idx"             ON "AnalyticsEvent"("source", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_erpCustomerId_createdAt_idx"      ON "AnalyticsEvent"("erpCustomerId", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_erpOrderId_idx"                   ON "AnalyticsEvent"("erpOrderId");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_createdAt_idx"                    ON "AnalyticsEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_utmSource_createdAt_idx"          ON "AnalyticsEvent"("utmSource", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_utmCampaign_createdAt_idx"        ON "AnalyticsEvent"("utmCampaign", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_eventType_idx"          ON "AnalyticsEvent"("sessionId", "eventType");

-- CreateTable: AnalyticsEventDelivery
CREATE TABLE IF NOT EXISTS "AnalyticsEventDelivery" (
  "id"               TEXT         NOT NULL,
  "analyticsEventId" TEXT         NOT NULL,
  "provider"         TEXT         NOT NULL,
  "status"           TEXT         NOT NULL DEFAULT 'pending',
  "attempts"         INTEGER      NOT NULL DEFAULT 0,
  "lastAttemptAt"    TIMESTAMP(3),
  "httpStatus"       INTEGER,
  "responseBody"     JSONB,
  "errorMessage"     TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnalyticsEventDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AnalyticsEventDelivery_analyticsEventId_fkey"
    FOREIGN KEY ("analyticsEventId")
    REFERENCES "AnalyticsEvent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AnalyticsEventDelivery_analyticsEventId_idx"  ON "AnalyticsEventDelivery"("analyticsEventId");
CREATE INDEX IF NOT EXISTS "AnalyticsEventDelivery_provider_status_idx"   ON "AnalyticsEventDelivery"("provider", "status");
CREATE INDEX IF NOT EXISTS "AnalyticsEventDelivery_status_createdAt_idx"  ON "AnalyticsEventDelivery"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEventDelivery_status_attempts_idx"   ON "AnalyticsEventDelivery"("status", "attempts", "lastAttemptAt");

-- CreateTable: AnalyticsSession
CREATE TABLE IF NOT EXISTS "AnalyticsSession" (
  "id"            TEXT         NOT NULL,
  "sessionId"     TEXT         NOT NULL,
  "utmSource"     TEXT,
  "utmMedium"     TEXT,
  "utmCampaign"   TEXT,
  "utmContent"    TEXT,
  "utmTerm"       TEXT,
  "referrer"      TEXT,
  "landingPage"   TEXT,
  "gaClientId"    TEXT,
  "fbp"           TEXT,
  "fbc"           TEXT,
  "ipAddress"     TEXT,
  "userAgent"     TEXT,
  "erpCustomerId" TEXT,
  "userId"        TEXT,
  "firstSeen"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeen"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsSession_sessionId_key"          ON "AnalyticsSession"("sessionId");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_utmSource_firstSeen_idx"       ON "AnalyticsSession"("utmSource", "firstSeen");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_utmCampaign_firstSeen_idx"     ON "AnalyticsSession"("utmCampaign", "firstSeen");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_erpCustomerId_idx"             ON "AnalyticsSession"("erpCustomerId");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_userId_idx"                    ON "AnalyticsSession"("userId");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_firstSeen_idx"                 ON "AnalyticsSession"("firstSeen");
