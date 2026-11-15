import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SUPPORTED_PORTAL_TYPES } from '@marppa-cloud/api-types';
import { PortalType } from '../../domain/enum/portal-type.enum';

export class CreateDnsApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsIn(SUPPORTED_PORTAL_TYPES)
  type: PortalType;

  @IsString()
  @IsNotEmpty()
  apiKey: string;
}
