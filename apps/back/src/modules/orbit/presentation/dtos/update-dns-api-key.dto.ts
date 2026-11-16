import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDnsApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  apiKey?: string;
}
