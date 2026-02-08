import { Expose } from "class-transformer"

export class WorkerImageModel {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() description: string | null;
  @Expose() osType: string;
  @Expose() osVersion: string | null;
  @Expose() osFamily: string;
  @Expose() imageUrl: string;
  @Expose() architecture: string;
  @Expose() virtualizationType: string;
  @Expose() workerStorageTypeId: string | null;
}