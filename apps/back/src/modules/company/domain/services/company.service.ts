import { Inject, Injectable } from '@nestjs/common';
import {
  CompanyRepository,
  COMPANY_REPOSITORY_SYMBOL,
} from '../repositories/company.repository';
import { CompanyEntity } from '../entities/company.entity';
import { CreateCompanyDto } from '../../presentation/dtos/create-company.dto';
import { UpdateCompanyDto } from '../../presentation/dtos/update-company.dto';
import { authorize } from '@/shared/domain/policy/authorize';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';

@Injectable()
export class CompanyService {
  constructor(
    @Inject(COMPANY_REPOSITORY_SYMBOL)
    private readonly companyRepository: CompanyRepository,
  ) {}

  public async create(data: CreateCompanyDto): Promise<CompanyEntity> {
    const { name, alias, description, parentCompanyId } = data;
    const company = new CompanyEntity(name, {
      alias,
      description,
      parentCompanyId,
    });

    return this.save(company);
  }

  public async update(
    id: string,
    data: UpdateCompanyDto,
  ): Promise<CompanyEntity> {
    authorize('manage', 'Company', id);

    const { name, alias, description, parentCompanyId } = data;
    const company = new CompanyEntity(name, {
      id,
      alias,
      description,
      parentCompanyId,
    });

    return this.save(company);
  }

  public async delete(id: string): Promise<void> {
    authorize('manage', 'Company', id);
    return this.companyRepository.delete(id);
  }

  public async findById(id: string): Promise<CompanyEntity | null> {
    authorize('read', 'Company', id);

    const company = await this.companyRepository.findById(id);

    if (company == null) {
      throw new NotFoundError();
    }

    return company;
  }

  private async save(company: CompanyEntity): Promise<CompanyEntity> {
    if (company.id == null) {
      return this.companyRepository.create(company);
    } else {
      return this.companyRepository.update(company.id, company);
    }
  }
}
