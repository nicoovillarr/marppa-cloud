import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateWorkerDto {
  @IsString()
  name: string;
}