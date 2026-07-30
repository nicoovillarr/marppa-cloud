import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MIN_ATOM_CPU_CORES, MIN_ATOM_RAM_MB } from '@marppa-cloud/api-types';

export class CreateAtomSizeDto {
  @IsString()
  name: string;

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
