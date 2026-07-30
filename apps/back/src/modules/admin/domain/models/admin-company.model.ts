export interface AdminCompanyCounts {
  users: number;
  workers: number;
  atoms: number;
  zones: number;
  portals: number;
}

export class AdminCompanyModel {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly alias: string | null,
    public readonly description: string | null,
    public readonly parentCompanyId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly counts: AdminCompanyCounts,
  ) { }

  get isRoot(): boolean {
    return this.parentCompanyId == null;
  }

  get hasResources(): boolean {
    const { workers, atoms, zones, portals } = this.counts;
    return workers + atoms + zones + portals > 0;
  }
}
