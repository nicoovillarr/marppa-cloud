import { IsBoolean, IsOptional } from 'class-validator';

export class SystemResetDto {
  @IsBoolean()
  @IsOptional()
  hard?: boolean;
}
