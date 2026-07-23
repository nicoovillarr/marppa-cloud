import { Expose } from 'class-transformer';

export class WorkerFamilyResponseModel {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() description: string | null;
}
