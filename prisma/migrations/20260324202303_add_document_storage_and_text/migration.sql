-- AlterTable
ALTER TABLE "Document" ADD COLUMN "fileSizeBytes" INTEGER;
ALTER TABLE "Document" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Document" ADD COLUMN "sha256" TEXT;
ALTER TABLE "Document" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "Document" ADD COLUMN "storageProvider" TEXT;

-- CreateTable
CREATE TABLE "DocumentText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "extractionState" TEXT NOT NULL DEFAULT 'completed',
    "extractedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentText_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentText_documentId_key" ON "DocumentText"("documentId");

-- CreateIndex
CREATE INDEX "DocumentText_documentId_idx" ON "DocumentText"("documentId");
