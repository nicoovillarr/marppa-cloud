import { StorageMedia } from '@marppa-cloud/db';

export interface ComputeUsage {
  running: number;
  provisioned: number;
  budget: number;
}

export interface StoragePoolUsage {
  provisioned: number;
  budget: number;
  media: StorageMedia[];
}

export interface HostUsageModel {
  vcpu: ComputeUsage;
  ramMB: ComputeUsage;
  workerDiskGB: StoragePoolUsage;
  atomVolumeGB: StoragePoolUsage;
}
