import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateEventDto {
  @IsEnum(EventTypeKey)
  type: EventTypeKey;

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
