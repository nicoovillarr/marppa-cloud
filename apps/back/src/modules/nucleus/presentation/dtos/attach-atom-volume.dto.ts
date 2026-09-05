import { IsString } from 'class-validator';

export class AttachAtomVolumeDto {
  @IsString()
  atomId: string;
}
