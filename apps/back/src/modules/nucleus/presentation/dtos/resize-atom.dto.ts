import { IsInt } from 'class-validator';

export class ResizeAtomDto {
  @IsInt()
  sizeId: number;
}
