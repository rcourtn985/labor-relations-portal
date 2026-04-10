-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "sourceFilename" TEXT,
    "chapter" TEXT,
    "localUnion" TEXT,
    "cbaType" TEXT,
    "state" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Document"
ADD COLUMN "agreementId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_canonicalKey_key" ON "Agreement"("canonicalKey");

-- CreateIndex
CREATE INDEX "Agreement_chapter_idx" ON "Agreement"("chapter");

-- CreateIndex
CREATE INDEX "Agreement_localUnion_idx" ON "Agreement"("localUnion");

-- CreateIndex
CREATE INDEX "Agreement_cbaType_idx" ON "Agreement"("cbaType");

-- CreateIndex
CREATE INDEX "Agreement_state_idx" ON "Agreement"("state");

-- CreateIndex
CREATE INDEX "Agreement_deletedAt_idx" ON "Agreement"("deletedAt");

-- CreateIndex
CREATE INDEX "Document_agreementId_idx" ON "Document"("agreementId");

-- AddForeignKey
ALTER TABLE "Document"
ADD CONSTRAINT "Document_agreementId_fkey"
FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;