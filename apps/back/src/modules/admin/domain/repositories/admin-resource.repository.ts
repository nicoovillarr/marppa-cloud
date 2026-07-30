import { AdminResourceModel } from '../models/admin-resource.model';

export const ADMIN_RESOURCE_REPOSITORY_SYMBOL = Symbol(
  'ADMIN_RESOURCE_REPOSITORY',
);

export abstract class AdminResourceRepository {
  abstract findAll(): Promise<AdminResourceModel[]>;
}
