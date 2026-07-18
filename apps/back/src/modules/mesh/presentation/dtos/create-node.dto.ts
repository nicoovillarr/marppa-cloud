import { IsOptional, IsString } from 'class-validator';

export class CreateNodeDto {
  @IsOptional()
  @IsString()
  workerId?: string;

  @IsOptional()
  @IsString()
  atomId?: string;
}
