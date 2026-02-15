import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateWorkerStorageTypeDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  persistent: boolean;

  @IsBoolean()
  attachable: boolean;

  @IsBoolean()
  shared: boolean;
}
