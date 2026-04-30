-- AddColumn: UTM attribution fields to AnalyticsEvent
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "utmSource"   TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "utmMedium"   TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "utmContent"  TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "utmTerm"     TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "referrer"    TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "landingPage" TEXT;

-- CreateIndex: UTM + session indexes on AnalyticsEvent
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_utmSource_createdAt_idx"   ON "AnalyticsEvent"("utmSource", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_utmCampaign_createdAt_idx" ON "AnalyticsEvent"("utmCampaign", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_eventType_idx"   ON "AnalyticsEvent"("sessionId", "eventType");

-- CreateTable: AnalyticsSession
CREATE TABLE IF NOT EXISTS "AnalyticsSession" (
    "id"            TEXT NOT NULL,
    "sessionId"     TEXT NOT NULL,
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

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsSession_sessionId_key" ON "AnalyticsSession"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsSession_utmSource_firstSeen_idx"   ON "AnalyticsSession"("utmSource", "firstSeen");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_utmCampaign_firstSeen_idx" ON "AnalyticsSession"("utmCampaign", "firstSeen");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_erpCustomerId_idx"          ON "AnalyticsSession"("erpCustomerId");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_userId_idx"                 ON "AnalyticsSession"("userId");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_firstSeen_idx"              ON "AnalyticsSession"("firstSeen");
