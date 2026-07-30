import { AdminCompanyModel } from '../models/admin-company.model';

export const ADMIN_COMPANY_REPOSITORY_SYMBOL = Symbol(
  'ADMIN_COMPANY_REPOSITORY',
);

export interface AdminCompanyWrite {
  name: string;
  alias?: string;
  description?: string;
  parentCompanyId?: string;
}

export abstract class AdminCompanyRepository {
  abstract findAll(): Promise<AdminCompanyModel[]>;
  abstract findById(id: string): Promise<AdminCompanyModel | null>;
  abstract findRoot(): Promise<AdminCompanyModel | null>;
  abstract create(data: AdminCompanyWrite): Promise<AdminCompanyModel>;
  abstract update(
    id: string,
    data: AdminCompanyWrite,
  ): Promise<AdminCompanyModel>;
  abstract delete(id: string): Promise<void>;
}
