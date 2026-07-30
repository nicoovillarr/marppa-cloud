import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateAtomImageDto {
  @IsString()
  name: string;

  @IsString()
  repository: string;

  @IsString()
  tag: string;

  @IsNumber()
  defaultSizeId: number;

  @IsString()
  @IsOptional()
  registry?: string;

  @IsString()
  @IsOptional()
  architecture?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  digest?: string;

  @IsArray()
  @IsString({ each: true })
  @Matches(/^[A-Z_]+$/, {
    each: true,
    message: 'each capability must be an uppercase Linux capability name',
  })
  @IsOptional()
  capabilities?: string[];

  @IsObject()
  @IsOptional()
  sysctls?: Record<string, string>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  command?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredEnvVars?: string[];
}
