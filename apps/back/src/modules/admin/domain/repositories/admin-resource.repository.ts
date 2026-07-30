import {
  AdminResourceModel,
  AdminResourceType,
} from '../models/admin-resource.model';

export const ADMIN_RESOURCE_REPOSITORY_SYMBOL = Symbol(
  'ADMIN_RESOURCE_REPOSITORY',
);

export interface AdminResourcePage {
  items: AdminResourceModel[];
  total: number;
}

export interface AdminResourceFilter {
  type?: AdminResourceType;
  companyId?: string;
}

export abstract class AdminResourceRepository {
  abstract findPage(
    skip: number,
    take: number,
    filter: AdminResourceFilter,
  ): Promise<AdminResourcePage>;
}
