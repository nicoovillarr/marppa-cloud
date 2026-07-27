import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateAtomEnvVarDto } from './create-atom-env-var.dto';

export class CreateAtomDto {
  // The name becomes the container's network alias, which Docker's embedded DNS
  // resolves for the other atoms in the zone; it has to be a valid DNS label.
  @IsString()
  @MaxLength(63)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message:
      'name must be a DNS label: lowercase letters, digits and "-", not starting or ending with "-"',
  })
  name: string;

  @IsNumber()
  imageId: number;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateAtomEnvVarDto)
  envVars?: CreateAtomEnvVarDto[];
}
