import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import {
  ATOM_VOLUME_MOUNT_POINT,
  MAX_ATOM_VOLUME_GB,
  MIN_ATOM_VOLUME_GB,
} from '@marppa-cloud/api-types';

export class CreateAtomVolumeDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(MIN_ATOM_VOLUME_GB)
  @Max(MAX_ATOM_VOLUME_GB)
  sizeGiB: number;

  @IsString()
  @Matches(ATOM_VOLUME_MOUNT_POINT)
  mountPoint: string;

  @IsString()
  @IsOptional()
  ownerId?: string;
}
