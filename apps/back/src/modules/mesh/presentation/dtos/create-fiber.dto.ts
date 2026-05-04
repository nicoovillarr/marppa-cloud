import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateFiberDto {
  @IsString()
  @IsNotEmpty()
  protocol: string;

  @IsNumber()
  @IsNotEmpty()
  targetPort: number;
}
