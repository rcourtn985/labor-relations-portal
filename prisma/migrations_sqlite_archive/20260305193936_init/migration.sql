-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "vectorStoreId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "ownerUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeBase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "kbId" TEXT NOT NULL,
    "openaiFileId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCba" BOOLEAN NOT NULL DEFAULT false,
    "state" TEXT,
    "localUnion" TEXT,
    "employer" TEXT,
    "effectiveFrom" DATETIME,
    "effectiveTo" DATETIME,
    "sharedToCbas" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Document_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_kbId_fkey" FOREIGN KEY ("kbId") REFERENCES "KnowledgeBase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "KnowledgeBase_ownerUserId_idx" ON "KnowledgeBase"("ownerUserId");

-- CreateIndex
CREATE INDEX "KnowledgeBase_visibility_idx" ON "KnowledgeBase"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBase_ownerUserId_name_key" ON "KnowledgeBase"("ownerUserId", "name");

-- CreateIndex
CREATE INDEX "Document_kbId_idx" ON "Document"("kbId");

-- CreateIndex
CREATE INDEX "Document_ownerUserId_idx" ON "Document"("ownerUserId");

-- CreateIndex
CREATE INDEX "Document_isCba_idx" ON "Document"("isCba");
