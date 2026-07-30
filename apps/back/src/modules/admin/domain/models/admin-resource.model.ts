import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

export type AdminResourceType = 'Worker' | 'Atom' | 'Zone' | 'Portal';

export class AdminResourceModel {
  constructor(
    public readonly id: string,
    public readonly type: AdminResourceType,
    public readonly name: string,
    public readonly status: ResourceStatus,
    public readonly companyId: string,
    public readonly companyName: string,
    public readonly createdAt: Date,
  ) { }
}
