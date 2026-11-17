-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL DEFAULT 'telegram',
    "externalChatId" TEXT NOT NULL,
    "chatType" TEXT NOT NULL,
    "titleSnapshot" TEXT,
    "usernameSnapshot" TEXT,
    "authorizationRef" TEXT NOT NULL,
    "authorizedAt" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SourceMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataSourceId" TEXT NOT NULL,
    "collectionRunId" TEXT NOT NULL,
    "externalMessageId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "sourceDate" DATETIME NOT NULL,
    "editDate" DATETIME,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,
    "authorUsernameSnapshot" TEXT,
    "authorDisplaySnapshot" TEXT,
    "senderChatId" TEXT,
    "replyToMessageId" TEXT,
    "forwardedFrom" TEXT,
    "rawText" TEXT,
    "normalizedText" TEXT,
    "entitiesJson" TEXT,
    "payloadHash" TEXT NOT NULL,
    "payloadRawJson" TEXT,
    "editState" TEXT NOT NULL DEFAULT 'original',
    "deletionEvidence" TEXT,
    "collectorVersion" TEXT NOT NULL,
    CONSTRAINT "SourceMessage_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SourceMessage_collectionRunId_dataSourceId_fkey" FOREIGN KEY ("collectionRunId", "dataSourceId") REFERENCES "CollectionRun" ("id", "dataSourceId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceMessageId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "fileUniqueId" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageMedia_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "SourceMessage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResultClassification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceMessageId" TEXT NOT NULL,
    "recordKey" TEXT NOT NULL,
    "tipId" TEXT,
    "category" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "evidence" TEXT,
    "justification" TEXT,
    "ruleCode" TEXT,
    "flagsJson" TEXT,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "classifierVersion" TEXT NOT NULL,
    "classifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResultClassification_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "SourceMessage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ResultClassification_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "Tip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceMessageId" TEXT,
    "resultClassificationId" TEXT,
    "ruleCode" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "validatorVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "ValidationRecord_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "SourceMessage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ValidationRecord_resultClassificationId_fkey" FOREIGN KEY ("resultClassificationId") REFERENCES "ResultClassification" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataSourceId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL,
    "receivedCount" INTEGER NOT NULL DEFAULT 0,
    "newMessageCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorDetail" TEXT,
    "collectorVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionRun_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_platform_externalChatId_key" ON "DataSource"("platform", "externalChatId");

-- CreateIndex
CREATE INDEX "SourceMessage_dataSourceId_sourceDate_idx" ON "SourceMessage"("dataSourceId", "sourceDate");

-- CreateIndex
CREATE INDEX "SourceMessage_collectionRunId_idx" ON "SourceMessage"("collectionRunId");

-- CreateIndex
CREATE INDEX "SourceMessage_payloadHash_idx" ON "SourceMessage"("payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "SourceMessage_dataSourceId_externalMessageId_revision_key" ON "SourceMessage"("dataSourceId", "externalMessageId", "revision");

-- CreateIndex
CREATE INDEX "MessageMedia_fileUniqueId_idx" ON "MessageMedia"("fileUniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageMedia_sourceMessageId_position_key" ON "MessageMedia"("sourceMessageId", "position");

-- CreateIndex
CREATE INDEX "ResultClassification_sourceMessageId_recordKey_classifiedAt_idx" ON "ResultClassification"("sourceMessageId", "recordKey", "classifiedAt");

-- CreateIndex
CREATE INDEX "ResultClassification_tipId_idx" ON "ResultClassification"("tipId");

-- CreateIndex
CREATE INDEX "ResultClassification_category_classifiedAt_idx" ON "ResultClassification"("category", "classifiedAt");

-- CreateIndex
CREATE INDEX "ValidationRecord_sourceMessageId_idx" ON "ValidationRecord"("sourceMessageId");

-- CreateIndex
CREATE INDEX "ValidationRecord_resultClassificationId_idx" ON "ValidationRecord"("resultClassificationId");

-- CreateIndex
CREATE INDEX "ValidationRecord_status_severity_idx" ON "ValidationRecord"("status", "severity");

-- CreateIndex
CREATE INDEX "CollectionRun_dataSourceId_startedAt_idx" ON "CollectionRun"("dataSourceId", "startedAt");

-- CreateIndex
CREATE INDEX "CollectionRun_status_startedAt_idx" ON "CollectionRun"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRun_id_dataSourceId_key" ON "CollectionRun"("id", "dataSourceId");
