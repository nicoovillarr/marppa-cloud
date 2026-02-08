import { Expose } from "class-transformer"

export class WorkerDiskModel {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() sizeGiB: number;
  @Expose() hostPath: string;
  @Expose() ownerId: string;
  @Expose() storageTypeId: string;
  @Expose() mountPoint: string | null;
  @Expose() isBoot: boolean;
  @Expose() workerId: string | null;
  @Expose() createdAt: Date;
  @Expose() createdBy: string;
  @Expose() updatedAt: Date | null;
  @Expose() updatedBy: string | null;
}