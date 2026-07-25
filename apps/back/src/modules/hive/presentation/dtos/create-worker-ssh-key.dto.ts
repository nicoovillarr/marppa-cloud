import { IsString, MaxLength } from 'class-validator';

export class CreateWorkerSshKeyDto {
  @IsString()
  @MaxLength(64)
  name: string;

  @IsString()
  @MaxLength(4096)
  publicKey: string;
}
