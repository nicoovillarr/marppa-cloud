import { Expose, Transform } from 'class-transformer';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

const nullable = () => Transform(({ value }) => value ?? null);

export class WorkerDiskResponseModel {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() status: ResourceStatus;
  @Expose() sizeGiB: number;
  @Expose() @nullable() hostPath: string | null;
  @Expose() ownerId: string;
  @Expose() storageTypeId: string;
  @Expose() @nullable() mountPoint: string | null;
  @Expose() @nullable() deviceTarget: string | null;
  @Expose() isBoot: boolean;
  @Expose() @nullable() workerId: string | null;
  @Expose() createdAt: Date;
  @Expose() createdBy: string;
  @Expose() @nullable() updatedAt: Date | null;
  @Expose() @nullable() updatedBy: string | null;
}
