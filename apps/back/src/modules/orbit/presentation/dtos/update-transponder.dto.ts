import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransponderMode } from '../../domain/enum/transponder-mode.enum';

export class UpdateTransponderDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  path?: string;

  @IsNumber()
  @IsOptional()
  port?: number;

  @IsEnum(TransponderMode)
  @IsOptional()
  mode?: TransponderMode;

  @IsBoolean()
  @IsOptional()
  cacheEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCookies?: boolean;

  @IsBoolean()
  @IsOptional()
  gzipEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nodeId?: string;
}
