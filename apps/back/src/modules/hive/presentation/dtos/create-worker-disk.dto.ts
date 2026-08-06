import { IsInt, IsString, IsOptional, Matches, Max, Min } from 'class-validator';
import {
  MAX_WORKER_VOLUME_GB,
  MIN_WORKER_VOLUME_GB,
  WORKER_VOLUME_MOUNT_POINT,
} from '@marppa-cloud/api-types';

export class CreateWorkerDiskDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(MIN_WORKER_VOLUME_GB)
  @Max(MAX_WORKER_VOLUME_GB)
  sizeGiB: number;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsInt()
  storageTypeId: number;

  @IsString()
  @Matches(WORKER_VOLUME_MOUNT_POINT)
  mountPoint: string;
}
