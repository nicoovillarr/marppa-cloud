CREATE TABLE "HostMetricSample" (
    "id" BIGSERIAL NOT NULL,
    "hostname" TEXT NOT NULL,
    "sampledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpuCores" INTEGER NOT NULL,
    "cpuPercent" DOUBLE PRECISION NOT NULL,
    "platformCpuPercent" DOUBLE PRECISION,
    "loadAverage1m" DOUBLE PRECISION NOT NULL,
    "memoryTotalMB" INTEGER NOT NULL,
    "memoryUsedMB" INTEGER NOT NULL,
    "platformMemoryMB" INTEGER,
    "atomVolumePoolGB" INTEGER,
    "atomVolumeAllocatedGB" INTEGER,
    "filesystems" JSONB NOT NULL,

    CONSTRAINT "HostMetricSample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HostMetricSample_hostname_sampledAt_idx" ON "HostMetricSample"("hostname", "sampledAt" DESC);
