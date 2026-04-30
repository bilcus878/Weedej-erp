-- CRM Extension — Phase 1 + 2 + 3
-- Adds: crm_contacts, crm_relationship_status, crm_interactions, crm_tasks, crm_opportunities

CREATE TABLE "crm_contacts" (
    "id"          TEXT         NOT NULL,
    "customerId"  TEXT         NOT NULL,
    "firstName"   TEXT         NOT NULL,
    "lastName"    TEXT,
    "role"        TEXT,
    "email"       TEXT,
    "phone"       TEXT,
    "isPrimary"   BOOLEAN      NOT NULL DEFAULT false,
    "note"        TEXT,
    "isActive"    BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_relationship_status" (
    "id"               TEXT         NOT NULL,
    "customerId"       TEXT         NOT NULL,
    "stage"            TEXT         NOT NULL DEFAULT 'prospect',
    "healthScore"      INTEGER,
    "ownerId"          TEXT,
    "lastContactedAt"  TIMESTAMP(3),
    "nextFollowUpAt"   TIMESTAMP(3),
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_relationship_status_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_interactions" (
    "id"            TEXT         NOT NULL,
    "customerId"    TEXT         NOT NULL,
    "contactId"     TEXT,
    "type"          TEXT         NOT NULL,
    "direction"     TEXT,
    "subject"       TEXT         NOT NULL,
    "body"          TEXT,
    "outcome"       TEXT,
    "occurredAt"    TIMESTAMP(3) NOT NULL,
    "durationMin"   INTEGER,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "createdById"   TEXT,
    "opportunityId" TEXT,
    CONSTRAINT "crm_interactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_tasks" (
    "id"           TEXT         NOT NULL,
    "customerId"   TEXT         NOT NULL,
    "contactId"    TEXT,
    "title"        TEXT         NOT NULL,
    "description"  TEXT,
    "type"         TEXT         NOT NULL DEFAULT 'follow_up',
    "status"       TEXT         NOT NULL DEFAULT 'open',
    "priority"     TEXT         NOT NULL DEFAULT 'normal',
    "dueAt"        TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    "assignedToId" TEXT,
    "createdById"  TEXT,
    "opportunityId" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_opportunities" (
    "id"              TEXT            NOT NULL,
    "customerId"      TEXT            NOT NULL,
    "title"           TEXT            NOT NULL,
    "description"     TEXT,
    "value"           DECIMAL(12, 2),
    "currency"        TEXT            NOT NULL DEFAULT 'CZK',
    "probability"     INTEGER,
    "stage"           TEXT            NOT NULL DEFAULT 'lead',
    "lostReason"      TEXT,
    "expectedCloseAt" TIMESTAMP(3),
    "closedAt"        TIMESTAMP(3),
    "ownerId"         TEXT,
    "createdById"     TEXT,
    "createdAt"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "crm_relationship_status_customerId_key" ON "crm_relationship_status"("customerId");

-- Indexes for performance
CREATE INDEX "crm_contacts_customerId_idx"             ON "crm_contacts"("customerId");
CREATE INDEX "crm_interactions_customerId_occurredAt_idx" ON "crm_interactions"("customerId", "occurredAt" DESC);
CREATE INDEX "crm_interactions_opportunityId_idx"      ON "crm_interactions"("opportunityId");
CREATE INDEX "crm_tasks_customerId_dueAt_idx"          ON "crm_tasks"("customerId", "dueAt");
CREATE INDEX "crm_tasks_assignedToId_status_idx"       ON "crm_tasks"("assignedToId", "status");
CREATE INDEX "crm_opportunities_customerId_idx"        ON "crm_opportunities"("customerId");
CREATE INDEX "crm_opportunities_stage_expectedCloseAt_idx" ON "crm_opportunities"("stage", "expectedCloseAt");

-- Foreign keys
ALTER TABLE "crm_contacts"            ADD CONSTRAINT "crm_contacts_customerId_fkey"
    FOREIGN KEY ("customerId")  REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_contacts"            ADD CONSTRAINT "crm_contacts_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")     ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_relationship_status" ADD CONSTRAINT "crm_relationship_status_customerId_fkey"
    FOREIGN KEY ("customerId")  REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_relationship_status" ADD CONSTRAINT "crm_relationship_status_ownerId_fkey"
    FOREIGN KEY ("ownerId")     REFERENCES "User"("id")     ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_interactions"        ADD CONSTRAINT "crm_interactions_customerId_fkey"
    FOREIGN KEY ("customerId")    REFERENCES "Customer"("id")         ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_interactions"        ADD CONSTRAINT "crm_interactions_contactId_fkey"
    FOREIGN KEY ("contactId")     REFERENCES "crm_contacts"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_interactions"        ADD CONSTRAINT "crm_interactions_createdById_fkey"
    FOREIGN KEY ("createdById")   REFERENCES "User"("id")             ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_interactions"        ADD CONSTRAINT "crm_interactions_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_tasks"               ADD CONSTRAINT "crm_tasks_customerId_fkey"
    FOREIGN KEY ("customerId")    REFERENCES "Customer"("id")         ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_tasks"               ADD CONSTRAINT "crm_tasks_contactId_fkey"
    FOREIGN KEY ("contactId")     REFERENCES "crm_contacts"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_tasks"               ADD CONSTRAINT "crm_tasks_assignedToId_fkey"
    FOREIGN KEY ("assignedToId")  REFERENCES "User"("id")             ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_tasks"               ADD CONSTRAINT "crm_tasks_createdById_fkey"
    FOREIGN KEY ("createdById")   REFERENCES "User"("id")             ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_tasks"               ADD CONSTRAINT "crm_tasks_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_opportunities"       ADD CONSTRAINT "crm_opportunities_customerId_fkey"
    FOREIGN KEY ("customerId")  REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_opportunities"       ADD CONSTRAINT "crm_opportunities_ownerId_fkey"
    FOREIGN KEY ("ownerId")     REFERENCES "User"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_opportunities"       ADD CONSTRAINT "crm_opportunities_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
