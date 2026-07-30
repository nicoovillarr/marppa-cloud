import { Expose } from 'class-transformer';

export class WorkerFlavorResponseModel {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() version: number;
  @Expose() cpuCores: number;
  @Expose() ramMB: number;
  @Expose() pricePerHourCents: number;
  @Expose() deprecatedAt: Date | null;
  @Expose() familyId: number;
}
