import { IsString } from 'class-validator';

export class AttachWorkerDiskDto {
  @IsString()
  workerId: string;
}
