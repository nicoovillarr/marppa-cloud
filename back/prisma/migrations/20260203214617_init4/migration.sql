/*
  Warnings:

  - Made the column `companyId` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'SYSTEM_TEST_EVENT';

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_companyId_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "companyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
