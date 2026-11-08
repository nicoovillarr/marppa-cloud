CREATE TYPE "StorageMedia" AS ENUM ('NVME', 'SSD', 'HDD');

ALTER TABLE "HostCapacity" RENAME COLUMN "diskGB" TO "workerDiskGB";
ALTER TABLE "HostCapacity" RENAME COLUMN "diskGBOverride" TO "workerDiskGBOverride";

ALTER TABLE "HostCapacity" ADD COLUMN "atomVolumeGB" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "HostCapacity" ADD COLUMN "atomVolumeGBOverride" INTEGER;
ALTER TABLE "HostCapacity" ADD COLUMN "workerDiskMedia" "StorageMedia";
ALTER TABLE "HostCapacity" ADD COLUMN "atomVolumeMedia" "StorageMedia";
