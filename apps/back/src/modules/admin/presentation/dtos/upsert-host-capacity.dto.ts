import { IsInt, Max, Min } from 'class-validator';
import {
  MAX_HOST_CPU_CORES,
  MAX_HOST_DISK_GB,
  MAX_HOST_RAM_MB,
} from '@/shared/domain/config/host-capacity.config';

export class UpsertHostCapacityDto {
  @IsInt()
  @Min(1)
  @Max(MAX_HOST_CPU_CORES)
  cpuCores: number;

  @IsInt()
  @Min(1)
  @Max(MAX_HOST_RAM_MB)
  ramMB: number;

  @IsInt()
  @Min(1)
  @Max(MAX_HOST_DISK_GB)
  diskGB: number;
}
