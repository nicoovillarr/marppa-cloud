import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsBoolean,
  IsInt,
  IsPositive,
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

  @IsInt()
  @IsPositive()
  dnsApiKeyId: number;

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
