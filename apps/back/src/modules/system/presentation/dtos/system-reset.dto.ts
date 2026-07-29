import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SystemResetDto {
  @IsBoolean()
  @IsOptional()
  hard?: boolean;

  @IsString()
  @IsOptional()
  confirmPassword?: string;
}
