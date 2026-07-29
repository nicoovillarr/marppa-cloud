-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "createdByIp" TEXT;

-- AlterTable
ALTER TABLE "Portal" ALTER COLUMN "deletedAt" SET DEFAULT 'epoch'::timestamp;
