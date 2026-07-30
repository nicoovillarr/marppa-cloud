import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_PAGE_SIZE = 200;

export class PaginationQuery {
  @Transform(({ value }) => (value == null ? 1 : Number(value)))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => (value == null ? 50 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @IsOptional()
  pageSize?: number = 50;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.pageSize ?? 50);
  }

  get take(): number {
    return this.pageSize ?? 50;
  }
}
