/*
  Warnings:

  - The primary key for the `Atom` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `key` on the `Atom` table. All the data in the column will be lost.
  - The primary key for the `Company` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `key` on the `Company` table. All the data in the column will be lost.
  - The primary key for the `Node` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `key` on the `Node` table. All the data in the column will be lost.
  - The primary key for the `Portal` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `key` on the `Portal` table. All the data in the column will be lost.
  - The primary key for the `Transponder` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `key` on the `Transponder` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `key` on the `User` table. All the data in the column will be lost.
  - The primary key for the `Worker` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `key` on the `Worker` table. All the data in the column will be lost.
  - The primary key for the `Zone` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `key` on the `Zone` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Atom" DROP CONSTRAINT "Atom_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_parentCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Fiber" DROP CONSTRAINT "Fiber_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_atomId_fkey";

-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_workerId_fkey";

-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "Portal" DROP CONSTRAINT "Portal_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Portal" DROP CONSTRAINT "Portal_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "Transponder" DROP CONSTRAINT "Transponder_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "Transponder" DROP CONSTRAINT "Transponder_portalId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerDisk" DROP CONSTRAINT "WorkerDisk_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerDisk" DROP CONSTRAINT "WorkerDisk_workerId_fkey";

-- DropForeignKey
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_ownerId_fkey";

-- AlterTable
ALTER TABLE "Atom" DROP CONSTRAINT "Atom_pkey",
DROP COLUMN "key",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Atom_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Company" DROP CONSTRAINT "Company_pkey",
DROP COLUMN "key",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Company_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Node" DROP CONSTRAINT "Node_pkey",
DROP COLUMN "key",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Node_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Portal" DROP CONSTRAINT "Portal_pkey",
DROP COLUMN "key",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Portal_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Transponder" DROP CONSTRAINT "Transponder_pkey",
DROP COLUMN "key",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Transponder_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "key",
ADD COLUMN     "id" TEXT NOT NULL,
ALTER COLUMN "companyId" DROP NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_pkey",
DROP COLUMN "key",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Worker_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_pkey",
DROP COLUMN "key",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Zone_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDisk" ADD CONSTRAINT "WorkerDisk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDisk" ADD CONSTRAINT "WorkerDisk_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atom" ADD CONSTRAINT "Atom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_atomId_fkey" FOREIGN KEY ("atomId") REFERENCES "Atom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fiber" ADD CONSTRAINT "Fiber_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portal" ADD CONSTRAINT "Portal_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portal" ADD CONSTRAINT "Portal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transponder" ADD CONSTRAINT "Transponder_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "Portal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transponder" ADD CONSTRAINT "Transponder_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
