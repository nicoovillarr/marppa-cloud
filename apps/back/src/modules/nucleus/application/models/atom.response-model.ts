import { Expose } from 'class-transformer';

export class AtomResponseModel {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() status: string;
  @Expose() createdAt: Date;
  @Expose() createdBy: string;
  @Expose() updatedAt: Date | null;
  @Expose() updatedBy: string | null;
  @Expose() ownerId: string;
  @Expose() imageId: number;
  @Expose() tag: string;
  @Expose() sizeId: number;
  @Expose() cpuCores: number;
  @Expose() ramMB: number;
}
