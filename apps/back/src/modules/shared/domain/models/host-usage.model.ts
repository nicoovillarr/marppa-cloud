import { StorageMedia } from '@marppa-cloud/db';

export type HostBudgetSource = 'REPORTED' | 'CONFIGURED';

export interface ComputeUsage {
  running: number;
  provisioned: number;
  budget: number;
  reported: number;
}

export interface VcpuUsage extends ComputeUsage {
  overcommit: number;
}

export interface StoragePoolUsage {
  provisioned: number;
  budget: number;
  reported: number;
  media: StorageMedia[];
}

export interface HostUsageModel {
  source: HostBudgetSource;
  vcpu: VcpuUsage;
  ramMB: ComputeUsage;
  workerDiskGB: StoragePoolUsage;
  atomVolumeGB: StoragePoolUsage;
}
