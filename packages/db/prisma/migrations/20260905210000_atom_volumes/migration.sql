-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'ATOM_VOLUME_CREATE';
ALTER TYPE "EventType" ADD VALUE 'ATOM_VOLUME_CREATE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_VOLUME_CREATED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_VOLUME_DELETE';
ALTER TYPE "EventType" ADD VALUE 'ATOM_VOLUME_DELETE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_VOLUME_DELETED';

-- AlterTable
ALTER TABLE "AtomImage"
    ADD COLUMN "dataPaths" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "AtomVolume" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'QUEUED',
    "sizeGiB" INTEGER NOT NULL,
    "hostPath" TEXT,
    "mountPoint" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "atomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "AtomVolume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtomVolume_atomId_mountPoint_key"
    ON "AtomVolume"("atomId", "mountPoint");

-- AddForeignKey
ALTER TABLE "AtomVolume" ADD CONSTRAINT "AtomVolume_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomVolume" ADD CONSTRAINT "AtomVolume_atomId_fkey"
    FOREIGN KEY ("atomId") REFERENCES "Atom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Catalog backfill: the container paths each approved image keeps its state in.
UPDATE "AtomImage" SET "dataPaths" = ARRAY['/data']
    WHERE "repository" IN ('library/redis', 'itzg/minecraft-server');

UPDATE "AtomImage" SET "dataPaths" = ARRAY['/var/lib/postgresql/data']
    WHERE "repository" = 'library/postgres';

UPDATE "AtomImage" SET "dataPaths" = ARRAY['/etc/wireguard']
    WHERE "repository" = 'wg-easy/wg-easy';

-- Redis writes its snapshot to the working directory and keeps no AOF unless told to.
-- With a custom command there is no redis.conf to carry either setting, so both are
-- pinned here: without them the volume mounted at /data stays empty.
UPDATE "AtomImage"
SET "command" = ARRAY[
        'sh',
        '-c',
        'exec redis-server --requirepass "$REDIS_PASSWORD" --appendonly yes --dir /data'
    ],
    "requiredEnvVars" = ARRAY['REDIS_PASSWORD']
WHERE "repository" = 'library/redis';
