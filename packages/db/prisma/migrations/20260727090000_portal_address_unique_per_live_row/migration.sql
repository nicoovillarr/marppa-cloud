-- Portal deletion became a status change, so a DELETED row used to hold its address
-- hostage forever against the plain UNIQUE(address): the same domain could never be
-- published again.
--
-- Postgres could express this as a partial unique index, but Prisma's schema language
-- cannot, and an index it does not know about is reported as drift on every
-- `migrate dev`. The sentinel column keeps the whole constraint inside the model:
-- every live row carries the epoch default, so UNIQUE(address, deletedAt) still allows
-- exactly one live portal per address, while each deletion stamps a distinct time and
-- releases the domain.

-- AlterTable
ALTER TABLE "Portal"
  ADD COLUMN "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT 'epoch'::timestamp;

-- Existing DELETED rows are already tombstones: give them a real stamp so they stop
-- competing for their address.
UPDATE "Portal" SET "deletedAt" = COALESCE("updatedAt", "createdAt")
  WHERE "status" = 'DELETED';

-- DropIndex
DROP INDEX "Portal_address_key";

-- CreateIndex
CREATE UNIQUE INDEX "Portal_address_deletedAt_key" ON "Portal"("address", "deletedAt");
