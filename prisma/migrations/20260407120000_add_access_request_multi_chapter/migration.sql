-- CreateTable
CREATE TABLE "AccessRequestChapter" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessRequestChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessRequestChapter_chapterId_idx" ON "AccessRequestChapter"("chapterId");

-- CreateIndex
CREATE INDEX "AccessRequestChapter_accessRequestId_idx" ON "AccessRequestChapter"("accessRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequestChapter_accessRequestId_chapterId_key" ON "AccessRequestChapter"("accessRequestId", "chapterId");

-- AddForeignKey
ALTER TABLE "AccessRequestChapter" ADD CONSTRAINT "AccessRequestChapter_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "AccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequestChapter" ADD CONSTRAINT "AccessRequestChapter_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

