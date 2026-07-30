import { IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationQuery } from '@/shared/presentation/dtos/pagination.query';
import type { AdminResourceType } from '@/admin/domain/models/admin-resource.model';

const RESOURCE_TYPES: AdminResourceType[] = ['Worker', 'Atom', 'Zone', 'Portal'];

export class AdminResourceQuery extends PaginationQuery {
  @IsIn(RESOURCE_TYPES)
  @IsOptional()
  type?: AdminResourceType;

  @IsString()
  @IsOptional()
  companyId?: string;
}
