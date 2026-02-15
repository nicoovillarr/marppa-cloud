import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransponderMode } from '../../domain/enum/transponder-mode.enum';

export class CreateTransponderDto {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsNumber()
  @IsNotEmpty()
  port: number;

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
  @IsOptional()
  nodeId: string;
}
