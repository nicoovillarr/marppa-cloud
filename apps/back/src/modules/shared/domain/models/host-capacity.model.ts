export interface HostCapacityOverride {
  cpuCoresOverride?: number | null;
  ramMBOverride?: number | null;
  diskGBOverride?: number | null;
}

export class HostCapacityModel {
  public readonly cpuCoresOverride: number | null;
  public readonly ramMBOverride: number | null;
  public readonly diskGBOverride: number | null;

  constructor(
    public readonly hostname: string,
    public readonly cpuCores: number,
    public readonly ramMB: number,
    public readonly diskGB: number,
    public readonly reportedAt: Date,
    override: HostCapacityOverride = {},
  ) {
    this.cpuCoresOverride = override.cpuCoresOverride ?? null;
    this.ramMBOverride = override.ramMBOverride ?? null;
    this.diskGBOverride = override.diskGBOverride ?? null;
  }

  get effectiveCpuCores(): number {
    return this.cpuCoresOverride ?? this.cpuCores;
  }

  get effectiveRamMB(): number {
    return this.ramMBOverride ?? this.ramMB;
  }

  get effectiveDiskGB(): number {
    return this.diskGBOverride ?? this.diskGB;
  }
}
