import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

export type AttachedWorkloadKind = 'atom' | 'worker';

export class AttachedWorkloadModel {
  constructor(
    public readonly kind: AttachedWorkloadKind,
    public readonly id: string,
    public readonly name: string,
    public readonly status: ResourceStatus,
  ) { }
}
