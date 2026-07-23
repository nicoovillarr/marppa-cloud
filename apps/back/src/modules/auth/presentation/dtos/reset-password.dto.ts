import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  captchaToken?: string;
}
