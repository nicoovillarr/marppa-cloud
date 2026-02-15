import { Expose } from 'class-transformer';

export class WorkerStorageTypeResponseModel {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() description: string | null;
  @Expose() persistent: boolean;
  @Expose() attachable: boolean;
  @Expose() shared: boolean;
}
