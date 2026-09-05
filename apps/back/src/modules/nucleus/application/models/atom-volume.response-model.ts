import { Expose, Transform } from 'class-transformer';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

const nullable = () => Transform(({ value }) => value ?? null);

export class AtomVolumeResponseModel {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() status: ResourceStatus;
  @Expose() sizeGiB: number;
  @Expose() @nullable() hostPath: string | null;
  @Expose() mountPoint: string;
  @Expose() ownerId: string;
  @Expose() @nullable() atomId: string | null;
  @Expose() createdAt: Date;
  @Expose() createdBy: string;
  @Expose() @nullable() updatedAt: Date | null;
  @Expose() @nullable() updatedBy: string | null;
}
