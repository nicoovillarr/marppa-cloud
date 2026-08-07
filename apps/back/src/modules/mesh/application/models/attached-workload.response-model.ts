import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { Expose } from 'class-transformer';

export class AttachedWorkloadResponseModel {
  @Expose()
  public readonly kind: 'atom' | 'worker';

  @Expose()
  public readonly id: string;

  @Expose()
  public readonly name: string;

  @Expose()
  public readonly status: ResourceStatus;
}
