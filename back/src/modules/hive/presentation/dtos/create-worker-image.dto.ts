import { IsOptional, IsString, IsNumber } from "class-validator";

export class CreateWorkerImageDto {
  @IsString()
  name: string;

  @IsString()
  osType: string;

  @IsString()
  osFamily: string;

  @IsString()
  imageUrl: string;

  @IsString()
  architecture: string;

  @IsString()
  virtualizationType: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  osVersion?: string;

  @IsNumber()
  @IsOptional()
  workerStorageTypeId?: number;
}