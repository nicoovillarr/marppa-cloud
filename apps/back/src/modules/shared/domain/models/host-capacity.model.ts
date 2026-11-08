import { StorageMedia } from '@marppa-cloud/db';

export interface HostCapacityReport {
  hostname: string;
  cpuCores: number;
  ramMB: number;
  workerDiskGB: number;
  atomVolumeGB: number;
  workerDiskMedia?: StorageMedia | null;
  atomVolumeMedia?: StorageMedia | null;
  reportedAt: Date;
}

export interface HostCapacityOverride {
  cpuCoresOverride?: number | null;
  ramMBOverride?: number | null;
  workerDiskGBOverride?: number | null;
  atomVolumeGBOverride?: number | null;
}

export class HostCapacityModel {
  public readonly hostname: string;
  public readonly cpuCores: number;
  public readonly ramMB: number;
  public readonly workerDiskGB: number;
  public readonly atomVolumeGB: number;
  public readonly workerDiskMedia: StorageMedia | null;
  public readonly atomVolumeMedia: StorageMedia | null;
  public readonly reportedAt: Date;

  public readonly cpuCoresOverride: number | null;
  public readonly ramMBOverride: number | null;
  public readonly workerDiskGBOverride: number | null;
  public readonly atomVolumeGBOverride: number | null;

  constructor(report: HostCapacityReport, override: HostCapacityOverride = {}) {
    this.hostname = report.hostname;
    this.cpuCores = report.cpuCores;
    this.ramMB = report.ramMB;
    this.workerDiskGB = report.workerDiskGB;
    this.atomVolumeGB = report.atomVolumeGB;
    this.workerDiskMedia = report.workerDiskMedia ?? null;
    this.atomVolumeMedia = report.atomVolumeMedia ?? null;
    this.reportedAt = report.reportedAt;

    this.cpuCoresOverride = override.cpuCoresOverride ?? null;
    this.ramMBOverride = override.ramMBOverride ?? null;
    this.workerDiskGBOverride = override.workerDiskGBOverride ?? null;
    this.atomVolumeGBOverride = override.atomVolumeGBOverride ?? null;
  }

  get effectiveCpuCores(): number {
    return this.cpuCoresOverride ?? this.cpuCores;
  }

  get effectiveRamMB(): number {
    return this.ramMBOverride ?? this.ramMB;
  }

  get effectiveWorkerDiskGB(): number {
    return this.workerDiskGBOverride ?? this.workerDiskGB;
  }

  get effectiveAtomVolumeGB(): number {
    return this.atomVolumeGBOverride ?? this.atomVolumeGB;
  }
}
