import { IsString } from 'class-validator';

export class UpdateAtomVolumeDto {
  @IsString()
  name: string;
}
