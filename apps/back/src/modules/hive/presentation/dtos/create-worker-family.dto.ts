import { IsIn, IsOptional, IsString } from 'class-validator';
import { WORKER_ARCHITECTURES } from '@marppa-cloud/api-types';

export class CreateWorkerFamilyDto {
  @IsString()
  name: string;

  @IsIn(WORKER_ARCHITECTURES)
  architecture: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;
}
