import { CompanyEntity } from '../entities/company.entity';

export const COMPANY_REPOSITORY_SYMBOL = Symbol('COMPANY_REPOSITORY');

export abstract class CompanyRepository {
  abstract create(data: CompanyEntity): Promise<CompanyEntity>;
  abstract update(id: string, data: CompanyEntity): Promise<CompanyEntity>;
  abstract delete(id: string): Promise<void>;
  abstract findById(id: string): Promise<CompanyEntity | null>;
  abstract findAll(): Promise<CompanyEntity[]>;
}
