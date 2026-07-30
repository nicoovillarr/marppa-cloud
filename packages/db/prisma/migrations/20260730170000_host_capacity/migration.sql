-- CreateTable
CREATE TABLE "HostCapacity" (
    "hostname" TEXT NOT NULL,
    "cpuCores" INTEGER NOT NULL,
    "ramMB" INTEGER NOT NULL,
    "diskGB" INTEGER NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostCapacity_pkey" PRIMARY KEY ("hostname")
);
