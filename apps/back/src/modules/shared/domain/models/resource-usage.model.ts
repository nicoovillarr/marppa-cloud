export class ResourceUsageModel {
  constructor(
    public readonly cpuCores: number,
    public readonly ramMB: number,
    public readonly workerDiskGB: number,
    public readonly atomVolumeGB: number,
  ) { }

  static empty(): ResourceUsageModel {
    return new ResourceUsageModel(0, 0, 0, 0);
  }

  plus(other: ResourceUsageModel): ResourceUsageModel {
    return new ResourceUsageModel(
      this.cpuCores + other.cpuCores,
      this.ramMB + other.ramMB,
      this.workerDiskGB + other.workerDiskGB,
      this.atomVolumeGB + other.atomVolumeGB,
    );
  }
}
