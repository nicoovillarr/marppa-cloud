import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateAtomEnvVarDto {
  // Anything outside this shape would have to be escaped before reaching
  // `docker run -e`; rejecting it here keeps the processor free of quoting.
  @IsString()
  @MaxLength(255)
  @Matches(/^[A-Za-z_][A-Za-z0-9_]*$/, {
    message: 'key must be a shell-safe environment variable name',
  })
  key: string;

  @IsString()
  @MaxLength(4096)
  @Matches(/^[^\r\n\0]*$/, {
    message: 'value may not contain newlines or null bytes',
  })
  value: string;
}
