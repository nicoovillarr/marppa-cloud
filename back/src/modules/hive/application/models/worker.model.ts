import { Expose } from "class-transformer";

export class WorkerModel {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() status: string;
  @Expose() macAddress: string;
  @Expose() createdAt: Date;
  @Expose() createdBy: string;
  @Expose() updatedAt: Date | null;
  @Expose() updatedBy: string | null;
  @Expose() ownerId: string;
  @Expose() imageId: number;
  @Expose() flavorId: number;
}