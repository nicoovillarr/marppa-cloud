import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import {
  ADMIN_COMPANY_REPOSITORY_SYMBOL,
  AdminCompanyRepository,
} from '../repositories/admin-company.repository';
import { AdminCompanyModel } from '../models/admin-company.model';
import { CreateAdminCompanyDto } from '@/admin/presentation/dtos/create-admin-company.dto';
import { UpdateAdminCompanyDto } from '@/admin/presentation/dtos/update-admin-company.dto';
import { RootCompanyProtectedError } from '../errors/root-company-protected.error';
import { CompanyNotEmptyError } from '../errors/company-not-empty.error';
import { CompanyCycleError } from '../errors/company-cycle.error';
import { CompanyParentRequiredError } from '../errors/company-parent-required.error';
import { RootCompanyMissingError } from '../errors/root-company-missing.error';

@Injectable()
export class AdminCompanyService {
  constructor(
    @Inject(ADMIN_COMPANY_REPOSITORY_SYMBOL)
    private readonly repository: AdminCompanyRepository,
  ) { }

  findAll(): Promise<AdminCompanyModel[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<AdminCompanyModel> {
    const company = await this.repository.findById(id);
    if (!company) {
      throw new NotFoundError();
    }

    return company;
  }

  async create(data: CreateAdminCompanyDto): Promise<AdminCompanyModel> {
    const root = await this.repository.findRoot();
    if (!root) {
      throw new RootCompanyMissingError();
    }

    return this.repository.create({ ...data, parentCompanyId: root.id });
  }

  async update(
    id: string,
    data: UpdateAdminCompanyDto,
  ): Promise<AdminCompanyModel> {
    const company = await this.findById(id);

    if (company.isRoot && data.parentCompanyId) {
      throw new RootCompanyProtectedError();
    }

    if (!company.isRoot && this.orphans(data)) {
      throw new CompanyParentRequiredError();
    }

    if (data.parentCompanyId) {
      await this.findById(data.parentCompanyId);
      await this.assertNoCycle(id, data.parentCompanyId);
    }

    return this.repository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const company = await this.findById(id);

    if (company.isRoot) {
      throw new RootCompanyProtectedError();
    }

    if (company.counts.users > 0 || company.hasResources) {
      throw new CompanyNotEmptyError(company.name);
    }

    await this.repository.delete(id);
  }

  private orphans(data: UpdateAdminCompanyDto): boolean {
    return 'parentCompanyId' in data && data.parentCompanyId == null;
  }

  private async assertNoCycle(id: string, parentId: string): Promise<void> {
    const byId = new Map(
      (await this.repository.findAll()).map((company) => [company.id, company]),
    );

    let ancestor = byId.get(parentId);
    while (ancestor) {
      if (ancestor.id === id) {
        throw new CompanyCycleError(byId.get(id)!.name);
      }

      ancestor = ancestor.parentCompanyId
        ? byId.get(ancestor.parentCompanyId)
        : undefined;
    }
  }
}
