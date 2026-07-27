import { IsString, Matches, MaxLength } from 'class-validator';

export class UpdateAtomDto {
  @IsString()
  @MaxLength(63)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message:
      'name must be a DNS label: lowercase letters, digits and "-", not starting or ending with "-"',
  })
  name: string;
}
