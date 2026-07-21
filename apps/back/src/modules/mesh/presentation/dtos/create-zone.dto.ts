import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  // e.g. "10.10.0.0/24". Optional: when omitted the next free block is
  // auto-assigned. Full validation (private range, size, overlap) happens in
  // NetmaskService/ZoneApiService.
  @IsOptional()
  @Matches(/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, {
    message: 'cidr must look like x.x.x.x/nn',
  })
  cidr?: string;
}
