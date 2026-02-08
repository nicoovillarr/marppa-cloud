import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateWorkerDto {
  @IsString()
  name: string;

  @IsString()
  macAddress: string;

  @IsNumber()
  imageId: number;

  @IsNumber()
  flavorId: number;
}