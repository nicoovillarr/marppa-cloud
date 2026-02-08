import { Expose } from "class-transformer"

export class WorkerFamilyModel {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() description: string | null;
}