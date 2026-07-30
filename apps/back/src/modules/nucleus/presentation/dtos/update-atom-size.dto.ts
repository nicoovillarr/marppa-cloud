import { IsNumber, IsOptional, Min } from 'class-validator';
import { MIN_ATOM_CPU_CORES, MIN_ATOM_RAM_MB } from '@marppa-cloud/api-types';

export class UpdateAtomSizeDto {
  @IsNumber()
  @Min(MIN_ATOM_CPU_CORES)
  cpuCores: number;

  @IsNumber()
  @Min(MIN_ATOM_RAM_MB)
  ramMB: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerHourCents?: number;
}
