import { IsNumber, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateWorkerDto {
  // The name becomes the VM hostname in cloud-init, which rejects anything
  // outside [A-Za-z0-9_-]; validating here turns a processor-side failure
  // (five retries, then FAILED) into an immediate 400.
  @IsString()
  @MaxLength(63)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'name may only contain letters, digits, "-" and "_"',
  })
  name: string;

  @IsNumber()
  imageId: number;

  @IsNumber()
  flavorId: number;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  publicSSH: string;
}
