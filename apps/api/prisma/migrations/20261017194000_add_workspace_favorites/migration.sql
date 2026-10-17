CREATE TABLE "WorkspaceFavorite" (
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceFavorite_pkey" PRIMARY KEY ("organizationId", "userId")
);

CREATE INDEX "WorkspaceFavorite_userId_createdAt_idx"
ON "WorkspaceFavorite"("userId", "createdAt");

ALTER TABLE "WorkspaceFavorite"
ADD CONSTRAINT "WorkspaceFavorite_organizationId_userId_fkey"
FOREIGN KEY ("organizationId", "userId") REFERENCES "Membership"("organizationId", "userId")
ON DELETE CASCADE ON UPDATE CASCADE;
