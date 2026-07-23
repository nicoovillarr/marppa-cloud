import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ConfirmNewPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
