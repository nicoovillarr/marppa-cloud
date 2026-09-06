import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_ATOM_VOLUME_GB, MIN_ATOM_VOLUME_GB } from '@marppa-cloud/api-types';

export class CreateAtomVolumeDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(MIN_ATOM_VOLUME_GB)
  @Max(MAX_ATOM_VOLUME_GB)
  sizeGiB: number;

  @IsString()
  @IsOptional()
  ownerId?: string;
}
