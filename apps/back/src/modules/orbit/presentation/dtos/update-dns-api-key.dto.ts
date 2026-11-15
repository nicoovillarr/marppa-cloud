import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDnsApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  apiKey?: string;
}
