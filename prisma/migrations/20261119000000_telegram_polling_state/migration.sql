-- One durable update cursor and health snapshot per Telegram bot identity.
-- The bot user ID is public identity metadata, never a token or credential.
CREATE TABLE "TelegramPollingState" (
    "botUserId" TEXT NOT NULL PRIMARY KEY,
    "lastConfirmedUpdateId" BIGINT,
    "lastPollAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastHeartbeatAt" DATETIME,
    "lastErrorAt" DATETIME,
    "lastErrorCode" TEXT,
    "leaseOwnerId" TEXT,
    "leaseToken" BIGINT NOT NULL DEFAULT 0,
    "leaseExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- A receipt is unique across all sources handled by this bot.
CREATE TABLE "TelegramUpdateReceipt" (
    "botUserId" TEXT NOT NULL,
    "updateId" BIGINT NOT NULL,
    "outcome" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("botUserId", "updateId"),
    CONSTRAINT "TelegramUpdateReceipt_botUserId_fkey" FOREIGN KEY ("botUserId") REFERENCES "TelegramPollingState"("botUserId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "TelegramUpdateReceipt_processedAt_idx" ON "TelegramUpdateReceipt"("processedAt");

-- Nullable additions preserve legacy runs and all existing source data.
ALTER TABLE "DataSource" ADD COLUMN "activationUpdateId" BIGINT;
ALTER TABLE "CollectionRun" ADD COLUMN "botUserId" TEXT REFERENCES "TelegramPollingState"("botUserId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollectionRun" ADD COLUMN "firstUpdateId" BIGINT;
ALTER TABLE "CollectionRun" ADD COLUMN "lastUpdateId" BIGINT;

CREATE INDEX "CollectionRun_botUserId_startedAt_idx" ON "CollectionRun"("botUserId", "startedAt");
