import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminCompanyDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  alias?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
