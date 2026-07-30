import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAdminCompanyDto {
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

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  parentCompanyId?: string;
}
