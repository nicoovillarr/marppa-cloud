/*
  Warnings:

  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `token` on the `Session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Session" DROP CONSTRAINT "Session_pkey",
DROP COLUMN "token",
ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "refreshToken" TEXT NOT NULL,
ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("refreshToken");
