/*
  Warnings:

  - You are about to drop the column `instanceTypeKey` on the `Worker` table. All the data in the column will be lost.
  - Added the required column `instanceTypeId` to the `Worker` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_instanceTypeKey_fkey";

-- AlterTable
ALTER TABLE "Worker" DROP COLUMN "instanceTypeKey",
ADD COLUMN     "instanceTypeId" INTEGER NOT NULL,
ALTER COLUMN "updatedAt" DROP NOT NULL,
ALTER COLUMN "updatedBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_instanceTypeId_fkey" FOREIGN KEY ("instanceTypeId") REFERENCES "WorkerMMI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
