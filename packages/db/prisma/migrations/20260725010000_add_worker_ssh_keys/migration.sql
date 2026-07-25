-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'WORKER_UPDATE_SSH_KEYS';
ALTER TYPE "EventType" ADD VALUE 'WORKER_UPDATE_SSH_KEYS_FAILED';
ALTER TYPE "EventType" ADD VALUE 'WORKER_SSH_KEYS_UPDATED';

-- CreateTable
CREATE TABLE "WorkerSshKey" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "workerId" TEXT NOT NULL,

    CONSTRAINT "WorkerSshKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerSshKey_workerId_publicKey_key" ON "WorkerSshKey"("workerId", "publicKey");

-- AddForeignKey
ALTER TABLE "WorkerSshKey" ADD CONSTRAINT "WorkerSshKey_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
