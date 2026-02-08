/*
  Warnings:

  - The primary key for the `WorkerFamily` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `WorkerFamily` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `WorkerFlavor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `WorkerFlavor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `flavorId` on the `Worker` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `familyId` on the `WorkerFlavor` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_flavorId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerFlavor" DROP CONSTRAINT "WorkerFlavor_familyId_fkey";

-- AlterTable
ALTER TABLE "Worker" DROP COLUMN "flavorId",
ADD COLUMN     "flavorId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WorkerFamily" DROP CONSTRAINT "WorkerFamily_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "WorkerFamily_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "WorkerFlavor" DROP CONSTRAINT "WorkerFlavor_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "familyId",
ADD COLUMN     "familyId" INTEGER NOT NULL,
ADD CONSTRAINT "WorkerFlavor_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "WorkerFlavor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerFlavor" ADD CONSTRAINT "WorkerFlavor_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "WorkerFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
