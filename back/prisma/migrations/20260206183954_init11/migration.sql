/*
  Warnings:

  - The `workerStorageTypeId` column on the `WorkerImage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `WorkerStorageType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `WorkerStorageType` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[name]` on the table `WorkerFamily` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[familyId,name]` on the table `WorkerFlavor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `WorkerStorageType` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `storageTypeId` on the `WorkerDisk` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "WorkerDisk" DROP CONSTRAINT "WorkerDisk_storageTypeId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerImage" DROP CONSTRAINT "WorkerImage_workerStorageTypeId_fkey";

-- AlterTable
ALTER TABLE "WorkerDisk" DROP COLUMN "storageTypeId",
ADD COLUMN     "storageTypeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WorkerImage" DROP COLUMN "workerStorageTypeId",
ADD COLUMN     "workerStorageTypeId" INTEGER;

-- AlterTable
ALTER TABLE "WorkerStorageType" DROP CONSTRAINT "WorkerStorageType_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "WorkerStorageType_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerFamily_name_key" ON "WorkerFamily"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerFlavor_familyId_name_key" ON "WorkerFlavor"("familyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerStorageType_name_key" ON "WorkerStorageType"("name");

-- AddForeignKey
ALTER TABLE "WorkerImage" ADD CONSTRAINT "WorkerImage_workerStorageTypeId_fkey" FOREIGN KEY ("workerStorageTypeId") REFERENCES "WorkerStorageType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDisk" ADD CONSTRAINT "WorkerDisk_storageTypeId_fkey" FOREIGN KEY ("storageTypeId") REFERENCES "WorkerStorageType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
