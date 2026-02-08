import { IsNumber, IsString } from "class-validator";

export class CreateWorkerFlavorDto {
  @IsString()
  name: string;

  @IsNumber()
  cpuCores: number;

  @IsNumber()
  ramMB: number;

  @IsNumber()
  diskGB: number;

  @IsNumber()
  familyId: number;
}