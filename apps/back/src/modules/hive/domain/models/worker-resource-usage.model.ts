export class WorkerResourceUsageModel {
  constructor(
    public readonly cpuCores: number,
    public readonly ramMB: number,
    public readonly diskGB: number,
  ) { }
}
