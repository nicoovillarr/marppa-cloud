import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNodeDto {
  @IsString()
  @IsNotEmpty()
  workerId: string;

  @IsString()
  @IsNotEmpty()
  atomId: string;
}
