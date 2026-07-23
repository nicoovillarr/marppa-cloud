-- CreateEnum
CREATE TYPE "EventResourceRole" AS ENUM ('PRIMARY', 'PARENT', 'RELATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'WORKER_UPDATE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'WORKER_START_FAILED';
ALTER TYPE "EventType" ADD VALUE 'WORKER_TERMINATE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'WORKER_DELETE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ZONE_CREATE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ZONE_DELETE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'NODE_ASSIGN_WORKER_FAILED';
ALTER TYPE "EventType" ADD VALUE 'NODE_UNASSIGN_WORKER_FAILED';

-- AlterTable
ALTER TABLE "EventResource" ADD COLUMN     "role" "EventResourceRole" NOT NULL DEFAULT 'RELATED';

-- CreateIndex
CREATE INDEX "EventResource_resourceType_resourceId_role_idx" ON "EventResource"("resourceType", "resourceId", "role");

-- CreateIndex
CREATE INDEX "EventResource_eventId_role_idx" ON "EventResource"("eventId", "role");
