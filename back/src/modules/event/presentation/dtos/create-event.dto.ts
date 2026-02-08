import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateEventDto {
  @IsString()
  type: string;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown> | unknown[];
}