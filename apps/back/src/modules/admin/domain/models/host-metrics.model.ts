import { StorageMedia } from '@marppa-cloud/db';

export interface FilesystemMetrics {
  mountPoint: string;
  device: string;
  fsType: string;
  sizeBytes: number;
  usedBytes: number;
  media: StorageMedia | null;
}

export interface HostMetricSampleModel {
  hostname: string;
  sampledAt: Date;
  cpuCores: number;
  cpuPercent: number;
  platformCpuPercent: number | null;
  loadAverage1m: number;
  memoryTotalMB: number;
  memoryUsedMB: number;
  platformMemoryMB: number | null;
  atomVolumePoolGB: number | null;
  atomVolumeAllocatedGB: number | null;
  filesystems: FilesystemMetrics[];
}

export interface HeadroomCheck {
  reserved: number;
  external: number;
  exceeded: boolean;
}

export interface HostMetricsModel {
  hostname: string;
  sampledAt: Date;
  stale: boolean;
  cpu: {
    cores: number;
    usedPercent: number;
    platformPercent: number | null;
    externalPercent: number | null;
    loadAverage1m: number;
  };
  memory: {
    totalMB: number;
    usedMB: number;
    platformMB: number | null;
    externalMB: number | null;
  };
  atomVolumePool: { sizeGB: number; allocatedGB: number } | null;
  filesystems: FilesystemMetrics[];
  headroom: {
    cpuCores: HeadroomCheck | null;
    memoryMB: HeadroomCheck | null;
  };
}
