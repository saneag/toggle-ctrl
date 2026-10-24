CREATE TABLE "FeatureToggle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByName" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archivedByName" TEXT,
    CONSTRAINT "FeatureToggle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeatureToggleAuditEvent" (
    "id" TEXT NOT NULL,
    "featureToggleId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeatureToggleAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeatureToggleSdkKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeatureToggleSdkKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureToggleSdkKey_organizationId_key" ON "FeatureToggleSdkKey"("organizationId");
CREATE UNIQUE INDEX "FeatureToggleSdkKey_key_key" ON "FeatureToggleSdkKey"("key");
CREATE INDEX "FeatureToggle_organizationId_archivedAt_updatedAt_idx" ON "FeatureToggle"("organizationId", "archivedAt", "updatedAt");
CREATE INDEX "FeatureToggleAuditEvent_featureToggleId_createdAt_idx" ON "FeatureToggleAuditEvent"("featureToggleId", "createdAt");
CREATE UNIQUE INDEX "FeatureToggle_active_name_key" ON "FeatureToggle"("organizationId", LOWER("name")) WHERE "archivedAt" IS NULL;

ALTER TABLE "FeatureToggle" ADD CONSTRAINT "FeatureToggle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureToggle" ADD CONSTRAINT "FeatureToggle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeatureToggle" ADD CONSTRAINT "FeatureToggle_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeatureToggle" ADD CONSTRAINT "FeatureToggle_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeatureToggleAuditEvent" ADD CONSTRAINT "FeatureToggleAuditEvent_featureToggleId_fkey" FOREIGN KEY ("featureToggleId") REFERENCES "FeatureToggle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureToggleAuditEvent" ADD CONSTRAINT "FeatureToggleAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeatureToggleSdkKey" ADD CONSTRAINT "FeatureToggleSdkKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
