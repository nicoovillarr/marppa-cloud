export class HostCapacityModel {
  constructor(
    public readonly hostname: string,
    public readonly cpuCores: number,
    public readonly ramMB: number,
    public readonly diskGB: number,
    public readonly reportedAt: Date,
  ) { }
}
