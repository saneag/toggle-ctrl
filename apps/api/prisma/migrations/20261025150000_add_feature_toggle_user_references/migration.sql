ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "FeatureToggle" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "archivedById" TEXT,
  CONSTRAINT "FeatureToggle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeatureToggle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FeatureToggle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FeatureToggle_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FeatureToggle_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "FeatureToggleAuditEvent" (
  "id" TEXT NOT NULL,
  "featureToggleId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "beforeState" JSONB,
  "afterState" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureToggleAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeatureToggleAuditEvent_featureToggleId_fkey" FOREIGN KEY ("featureToggleId") REFERENCES "FeatureToggle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FeatureToggleAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "FeatureToggleSdkKey" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureToggleSdkKey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeatureToggleSdkKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureToggleSdkKey_organizationId_key" ON "FeatureToggleSdkKey"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureToggleSdkKey_key_key" ON "FeatureToggleSdkKey"("key");
CREATE INDEX IF NOT EXISTS "FeatureToggle_archivedAt_idx" ON "FeatureToggle"("archivedAt");
CREATE INDEX IF NOT EXISTS "FeatureToggle_organizationId_archivedAt_updatedAt_idx" ON "FeatureToggle"("organizationId", "archivedAt", "updatedAt");
CREATE INDEX IF NOT EXISTS "FeatureToggleAuditEvent_featureToggleId_createdAt_idx" ON "FeatureToggleAuditEvent"("featureToggleId", "createdAt");

ALTER TABLE "FeatureToggle"
  ALTER COLUMN "createdById" SET NOT NULL,
  ALTER COLUMN "updatedById" SET NOT NULL,
  DROP COLUMN IF EXISTS "createdByName",
  DROP COLUMN IF EXISTS "updatedByName",
  DROP COLUMN IF EXISTS "archivedByName";

ALTER TABLE "FeatureToggleAuditEvent" DROP COLUMN IF EXISTS "actorName";

ALTER TABLE "FeatureToggle"
  DROP CONSTRAINT IF EXISTS "FeatureToggle_createdById_fkey",
  DROP CONSTRAINT IF EXISTS "FeatureToggle_updatedById_fkey",
  DROP CONSTRAINT IF EXISTS "FeatureToggle_archivedById_fkey";
ALTER TABLE "FeatureToggle"
  ADD CONSTRAINT "FeatureToggle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FeatureToggle_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FeatureToggle_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeatureToggleAuditEvent"
  DROP CONSTRAINT IF EXISTS "FeatureToggleAuditEvent_actorId_fkey";
ALTER TABLE "FeatureToggleAuditEvent"
  ADD CONSTRAINT "FeatureToggleAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
