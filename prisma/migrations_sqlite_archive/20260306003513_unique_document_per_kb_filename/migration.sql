/*
  Warnings:

  - A unique constraint covering the columns `[kbId,filename]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Document_kbId_filename_key" ON "Document"("kbId", "filename");
