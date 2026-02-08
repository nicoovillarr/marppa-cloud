import { Expose } from "class-transformer"

export class WorkerFlavorModel {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() cpuCores: number;
  @Expose() ramMB: number;
  @Expose() diskGB: number;
  @Expose() familyId: number;
}