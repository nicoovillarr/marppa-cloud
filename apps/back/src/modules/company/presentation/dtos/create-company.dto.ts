import { IsString, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(3)
  public readonly name: string;

  @IsString()
  @MinLength(3)
  public readonly alias?: string;

  @IsString()
  public readonly description?: string;

  @IsString()
  public readonly parentCompanyId?: string;
}
