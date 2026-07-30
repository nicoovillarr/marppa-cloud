import { IsOptional, IsString } from 'class-validator';

export class UpdateWorkerFamilyDto {
  @IsString()
  @IsOptional()
  description?: string;
}
