import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateWorkerDto {
  @IsString()
  name: string;

  @IsNumber()
  imageId: number;

  @IsNumber()
  flavorId: number;

  @IsString()
  @IsOptional()
  ownerId?: string;
}