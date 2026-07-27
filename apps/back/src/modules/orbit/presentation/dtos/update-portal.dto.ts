import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { PortalType, SUPPORTED_PORTAL_TYPES } from '@marppa-cloud/api-types';

export class UpdatePortalDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string;

  @IsIn(SUPPORTED_PORTAL_TYPES)
  @IsOptional()
  type?: PortalType;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  apiKey?: string;

  @IsBoolean()
  @IsOptional()
  enableCompression?: boolean;

  @IsBoolean()
  @IsOptional()
  corsEnabled?: boolean;

  @IsString()
  @IsOptional()
  zoneId?: string;
}
