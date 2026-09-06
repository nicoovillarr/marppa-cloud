import { IsString, Matches } from 'class-validator';
import { ATOM_VOLUME_MOUNT_POINT } from '@marppa-cloud/api-types';

export class AttachAtomVolumeDto {
  @IsString()
  atomId: string;

  @IsString()
  @Matches(ATOM_VOLUME_MOUNT_POINT)
  mountPoint: string;
}
