-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "buildDuration" INTEGER,
ADD COLUMN     "buildOutput" JSONB,
ADD COLUMN     "buildStatus" TEXT DEFAULT 'pending',
ADD COLUMN     "lastBuildAt" TIMESTAMP(3),
ADD COLUMN     "portNumber" INTEGER,
ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "processId" TEXT;
