/*
  Warnings:

  - You are about to drop the column `instanceTypeId` on the `Worker` table. All the data in the column will be lost.
  - You are about to drop the `WorkerMMI` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkerMMIFamily` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `flavorId` to the `Worker` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_instanceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerMMI" DROP CONSTRAINT "WorkerMMI_familyId_fkey";

-- AlterTable
ALTER TABLE "Worker" DROP COLUMN "instanceTypeId",
ADD COLUMN     "flavorId" TEXT NOT NULL;

-- DropTable
DROP TABLE "WorkerMMI";

-- DropTable
DROP TABLE "WorkerMMIFamily";

-- CreateTable
CREATE TABLE "WorkerFamily" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "WorkerFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerFlavor" (
    "id" TEXT NOT NULL,
    "cpuCores" DOUBLE PRECISION NOT NULL,
    "ramMB" INTEGER NOT NULL,
    "diskGB" INTEGER NOT NULL,
    "familyId" TEXT NOT NULL,

    CONSTRAINT "WorkerFlavor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "WorkerFlavor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerFlavor" ADD CONSTRAINT "WorkerFlavor_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "WorkerFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
