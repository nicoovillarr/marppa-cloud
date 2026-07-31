import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class UpdateHostCapacityDto {
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @IsOptional()
  cpuCoresOverride?: number | null;

  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @IsOptional()
  ramMBOverride?: number | null;

  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @IsOptional()
  diskGBOverride?: number | null;
}
