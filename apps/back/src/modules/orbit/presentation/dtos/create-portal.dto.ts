import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { SUPPORTED_PORTAL_TYPES } from '@marppa-cloud/api-types';
import { PortalType } from '../../domain/enum/portal-type.enum';

export class CreatePortalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsIn(SUPPORTED_PORTAL_TYPES)
  type: PortalType;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

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
