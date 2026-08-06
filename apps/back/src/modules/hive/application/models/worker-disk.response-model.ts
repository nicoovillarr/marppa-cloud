import { Expose } from 'class-transformer';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

export class WorkerDiskResponseModel {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() status: ResourceStatus;
  @Expose() sizeGiB: number;
  @Expose() hostPath: string | null;
  @Expose() ownerId: string;
  @Expose() storageTypeId: string;
  @Expose() mountPoint: string | null;
  @Expose() deviceTarget: string | null;
  @Expose() isBoot: boolean;
  @Expose() workerId: string | null;
  @Expose() createdAt: Date;
  @Expose() createdBy: string;
  @Expose() updatedAt: Date | null;
  @Expose() updatedBy: string | null;
}
