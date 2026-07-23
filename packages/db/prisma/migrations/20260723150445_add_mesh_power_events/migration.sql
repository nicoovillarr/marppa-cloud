-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'ZONE_START';
ALTER TYPE "EventType" ADD VALUE 'ZONE_START_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ZONE_STARTED';
ALTER TYPE "EventType" ADD VALUE 'ZONE_STOP';
ALTER TYPE "EventType" ADD VALUE 'ZONE_STOP_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ZONE_STOPPED';
ALTER TYPE "EventType" ADD VALUE 'NODE_START';
ALTER TYPE "EventType" ADD VALUE 'NODE_START_FAILED';
ALTER TYPE "EventType" ADD VALUE 'NODE_STARTED';
ALTER TYPE "EventType" ADD VALUE 'NODE_STOP';
ALTER TYPE "EventType" ADD VALUE 'NODE_STOP_FAILED';
ALTER TYPE "EventType" ADD VALUE 'NODE_STOPPED';
ALTER TYPE "EventType" ADD VALUE 'NODE_START_FIBER';
ALTER TYPE "EventType" ADD VALUE 'NODE_START_FIBER_FAILED';
ALTER TYPE "EventType" ADD VALUE 'NODE_FIBER_STARTED';
ALTER TYPE "EventType" ADD VALUE 'NODE_STOP_FIBER';
ALTER TYPE "EventType" ADD VALUE 'NODE_STOP_FIBER_FAILED';
ALTER TYPE "EventType" ADD VALUE 'NODE_FIBER_STOPPED';
