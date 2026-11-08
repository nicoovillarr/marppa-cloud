import { IsInt } from 'class-validator';

export class ResizeWorkerDto {
  @IsInt()
  flavorId: number;
}
