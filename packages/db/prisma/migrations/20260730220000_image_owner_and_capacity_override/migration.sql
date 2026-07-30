-- Reserved headroom lives beside the measured value instead of replacing it, so
-- the host preflight can keep overwriting what it measures without erasing the
-- operator's intent.
ALTER TABLE "HostCapacity" ADD COLUMN "cpuCoresOverride" INTEGER;
ALTER TABLE "HostCapacity" ADD COLUMN "ramMBOverride" INTEGER;
ALTER TABLE "HostCapacity" ADD COLUMN "diskGBOverride" INTEGER;

-- reportedAt stops tracking every write: an admin editing an override is not a
-- host reporting in. The preflight now stamps it explicitly.
ALTER TABLE "HostCapacity" ALTER COLUMN "reportedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- A NULL owner is a public image, mirroring WorkerFamily. Names stay globally
-- unique, so a tenant-specific image needs a distinct name.
ALTER TABLE "WorkerImage" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "AtomImage" ADD COLUMN "ownerId" TEXT;

CREATE INDEX "WorkerImage_ownerId_idx" ON "WorkerImage"("ownerId");
CREATE INDEX "AtomImage_ownerId_idx" ON "AtomImage"("ownerId");

ALTER TABLE "WorkerImage" ADD CONSTRAINT "WorkerImage_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AtomImage" ADD CONSTRAINT "AtomImage_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
