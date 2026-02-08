import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from "class-validator";
import { PortalType } from "../../domain/enum/portal-type.enum";

export class CreatePortalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
  
  @IsString()
  @IsNotEmpty()
  address: string;
  
  @IsEnum(PortalType)
  type: PortalType;
  
  @IsString()
  @IsNotEmpty()
  apiKey: string;
  
  @IsBoolean()
  @IsOptional()
  listenHttp?: boolean;
  
  @IsBoolean()
  @IsOptional()
  listenHttps?: boolean;
  
  @IsString()
  @IsOptional()
  sslCertificate?: string;
  
  @IsString()
  @IsOptional()
  sslKey?: string;
  
  @IsBoolean()
  @IsOptional()
  enableCompression?: boolean;
  
  @IsBoolean()
  @IsOptional()
  cacheEnabled?: boolean;
  
  @IsBoolean()
  @IsOptional()
  corsEnabled?: boolean;
  
  @IsBoolean()
  @IsOptional()
  defaultServer?: boolean;
  
  @IsString()
  @IsOptional()
  zoneId?: string;
}