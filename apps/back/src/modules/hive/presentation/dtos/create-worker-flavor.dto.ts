import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import {
  MIN_WORKER_CPU_CORES,
  MIN_WORKER_RAM_MB,
} from '@marppa-cloud/api-types';

export class CreateWorkerFlavorDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(MIN_WORKER_CPU_CORES)
  cpuCores: number;

  @IsNumber()
  @Min(MIN_WORKER_RAM_MB)
  ramMB: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerHourCents?: number;

  @IsNumber()
  familyId: number;
}
