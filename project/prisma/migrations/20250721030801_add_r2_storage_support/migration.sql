/*
  Warnings:

  - You are about to drop the column `files` on the `Website` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Website` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Website" DROP COLUMN "files",
DROP COLUMN "status",
ADD COLUMN     "extractedFiles" JSONB,
ADD COLUMN     "fileCount" INTEGER,
ADD COLUMN     "originalZipUrl" TEXT,
ADD COLUMN     "storageProvider" TEXT NOT NULL DEFAULT 'r2',
ADD COLUMN     "totalFileSize" INTEGER;

-- CreateTable
CREATE TABLE "WebsiteFile" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "r2Url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteFile_websiteId_path_key" ON "WebsiteFile"("websiteId", "path");

-- AddForeignKey
ALTER TABLE "WebsiteFile" ADD CONSTRAINT "WebsiteFile_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
