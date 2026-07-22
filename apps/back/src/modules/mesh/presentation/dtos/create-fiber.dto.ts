import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFiberDto {
  // Goes verbatim into an `nft` rule: anything other than tcp/udp is a rule
  // syntax error inside the processor, i.e. five retries and a FAILED fiber.
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['tcp', 'udp'])
  protocol: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  targetPort: number;
}
