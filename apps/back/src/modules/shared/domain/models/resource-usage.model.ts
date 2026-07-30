export class ResourceUsageModel {
  constructor(
    public readonly cpuCores: number,
    public readonly ramMB: number,
    public readonly diskGB: number,
  ) { }

  plus(other: ResourceUsageModel): ResourceUsageModel {
    return new ResourceUsageModel(
      this.cpuCores + other.cpuCores,
      this.ramMB + other.ramMB,
      this.diskGB + other.diskGB,
    );
  }
}
