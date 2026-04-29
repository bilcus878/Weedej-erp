-- RBAC + Audit Log schema
-- Adds: Role, Permission, RolePermission, UserRole, AuditLog

CREATE TABLE "Role" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "displayName" TEXT         NOT NULL,
    "description" TEXT,
    "isSystem"    BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "displayName" TEXT         NOT NULL,
    "module"      TEXT         NOT NULL,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "roleId"       TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "UserRole" (
    "userId"     TEXT         NOT NULL,
    "roleId"     TEXT         NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE "AuditLog" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT,
    "username"   TEXT,
    "role"       TEXT,
    "actionType" TEXT         NOT NULL,
    "entityName" TEXT,
    "entityId"   TEXT,
    "fieldName"  TEXT,
    "oldValue"   TEXT,
    "newValue"   TEXT,
    "module"     TEXT,
    "ipAddress"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "Role_name_key"       ON "Role"("name");
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- Indexes
CREATE INDEX "Role_name_idx"                ON "Role"("name");
CREATE INDEX "Permission_name_idx"          ON "Permission"("name");
CREATE INDEX "Permission_module_idx"        ON "Permission"("module");
CREATE INDEX "RolePermission_roleId_idx"    ON "RolePermission"("roleId");
CREATE INDEX "RolePermission_permId_idx"    ON "RolePermission"("permissionId");
CREATE INDEX "UserRole_userId_idx"          ON "UserRole"("userId");
CREATE INDEX "UserRole_roleId_idx"          ON "UserRole"("roleId");
CREATE INDEX "AuditLog_userId_idx"          ON "AuditLog"("userId");
CREATE INDEX "AuditLog_actionType_idx"      ON "AuditLog"("actionType");
CREATE INDEX "AuditLog_entityName_idx"      ON "AuditLog"("entityName");
CREATE INDEX "AuditLog_entityId_idx"        ON "AuditLog"("entityId");
CREATE INDEX "AuditLog_module_idx"          ON "AuditLog"("module");
CREATE INDEX "AuditLog_createdAt_idx"       ON "AuditLog"("createdAt");

-- Foreign keys
ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey"
        FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "RolePermission_permissionId_fkey"
        FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "UserRole_roleId_fkey"
        FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
