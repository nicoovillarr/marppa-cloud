import { IsBoolean, IsDate, IsNumber, IsString, IsOptional } from "class-validator";

export class CreateWorkerDiskDto {
  @IsString()
  name: string;

  @IsNumber()
  sizeGiB: number;

  @IsString()
  hostPath: string;

  @IsString()
  ownerId: string;

  @IsNumber()
  storageTypeId: number;

  @IsString()
  @IsOptional()
  mountPoint: string;

  @IsBoolean()
  isBoot: boolean;

  @IsString()
  @IsOptional()
  workerId: string | null;
}