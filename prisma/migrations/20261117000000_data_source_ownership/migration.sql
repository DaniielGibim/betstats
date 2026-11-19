-- Legacy sources remain unowned until ownership is assigned explicitly.
ALTER TABLE "DataSource" ADD COLUMN "ownerUserId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DataSource" ADD COLUMN "removedAt" DATETIME;

CREATE INDEX "DataSource_ownerUserId_active_idx" ON "DataSource"("ownerUserId", "active");
CREATE UNIQUE INDEX "DataSource_id_ownerUserId_key" ON "DataSource"("id", "ownerUserId");

CREATE TABLE "SourceRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'telegram',
    "requestedUsername" TEXT NOT NULL,
    "normalizedUsername" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_resolution',
    "resolvedSourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SourceRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SourceRegistration_resolvedSourceId_userId_fkey" FOREIGN KEY ("resolvedSourceId", "userId") REFERENCES "DataSource" ("id", "ownerUserId") ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX "SourceRegistration_resolvedSourceId_userId_key" ON "SourceRegistration"("resolvedSourceId", "userId");
CREATE UNIQUE INDEX "SourceRegistration_userId_platform_normalizedUsername_key" ON "SourceRegistration"("userId", "platform", "normalizedUsername");
CREATE INDEX "SourceRegistration_userId_status_idx" ON "SourceRegistration"("userId", "status");
