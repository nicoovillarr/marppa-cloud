import { IsOptional, IsString } from 'class-validator';

export class CreateWorkerFamilyDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
